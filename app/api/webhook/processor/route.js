export const dynamic = 'force-dynamic'; // Prevents Next.js from caching this webhook at build time

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createClient } from '@supabase/supabase-js';

async function handler(req) {
  let tmpFilePath = '';

  try {
    const body = await req.json();

    // 1. Safe Metadata Extraction from IvozProvider
    const callId = body.callid;
    const tenantId = body.company_id || "default_tenant";
    const agentExt = body.user_id || "Unknown";
    const customerPhone = body.caller_number || "Unknown";

    if (!callId) {
      return NextResponse.json({ error: "Missing callid in payload" }, { status: 400 });
    }

    // 2. IVOZPROVIDER JWT AUTHENTICATION
    // Authenticating against your specific Azure IP
    const authRes = await fetch('https://62.84.182.233/api/brand/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.IVOZ_USERNAME,
        password: process.env.IVOZ_PASSWORD
      })
    });

    if (!authRes.ok) {
      throw new Error(`Ivoz Auth Failed: ${authRes.statusText}`);
    }
    
    const { token } = await authRes.json();

    // 3. FETCH AUDIO USING JWT TOKEN
    const audioRes = await fetch(`https://62.84.182.233/api/v1/recordings/${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!audioRes.ok) {
      throw new Error(`Failed to download audio from IvozProvider: ${audioRes.statusText}`);
    }
    
    tmpFilePath = path.join('/tmp', `${callId}.wav`);
    const fileStream = fs.createWriteStream(tmpFilePath);
    await pipeline(audioRes.body, fileStream);

    // 4. UPLOAD TO GOOGLE DRIVE
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
      throw new Error("GOOGLE_DRIVE_CREDENTIALS environment variable is missing.");
    }

    const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
    const auth = new google.auth.JWT(
      credentials.client_email, 
      null, 
      credentials.private_key, 
      ['https://www.googleapis.com/auth/drive']
    );
    const drive = google.drive({ version: 'v3', auth });

    const driveResponse = await drive.files.create({
      resource: { name: `${callId}.wav`, parents: [process.env.DRIVE_FOLDER_ID] },
      media: { mimeType: 'audio/wav', body: fs.createReadStream(tmpFilePath) },
      fields: 'id, webViewLink'
    });

    // 5. PROCESS AUDIO WITH GEMINI 2.5 FLASH LITE
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const geminiUpload = await ai.files.upload({
      file: tmpFilePath,
      config: { 
        mimeType: 'audio/wav',
        displayName: `Call_${callId}` 
      }
    });

    const prompt = `
      You are Bamisoro's QA intelligence analyst. Analyze the call and output a strict JSON object:
      {
        "customer_name": "Extract name if mentioned, otherwise 'Unknown'",
        "agent_name": "Extract agent name if mentioned, otherwise 'Agent'",
        "csat_score": integer out of 100 based on resolution and empathy,
        "sentiment": "Positive, Neutral, or Negative",
        "sentiment_velocity": "Sentence explaining how the mood shifted",
        "intent_detected": "Core reason for the call",
        "next_action": "Required follow up action",
        "ai_summary": "Concise 3-sentence summary",
        "transcript": "Word for word transcript with Agent: and Caller: labels"
      }
    `;

    const analytics = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [geminiUpload, { text: prompt }],
      config: { responseMimeType: "application/json" }
    });

    const aiData = JSON.parse(analytics.text);

    // 6. BUILD FINAL BAMISORO RECORD
    const finalRecord = {
      call_id: callId,
      tenant_id: tenantId,
      agent_ext: agentExt,
      customer_phone: customerPhone,
      drive_link: driveResponse.data.webViewLink,
      ...aiData
    };

    // 7. SAVE TO SUPABASE LIVE DATABASE
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error: dbError } = await supabase
      .from('bamisoro_calls')
      .insert([finalRecord]);

    if (dbError) throw new Error(`Supabase Insert Error: ${dbError.message}`);

    console.log("Successfully processed and saved call:", callId);

    return NextResponse.json({ success: true, data: finalRecord });

  } catch (error) {
    console.error("Processor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // 8. CLEANUP: Always remove the temporary file to prevent memory leaks on Vercel
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
  }
}

// QStash signature verification ensures unauthorized users cannot trigger this endpoint
export const POST = verifySignatureAppRouter(handler);
