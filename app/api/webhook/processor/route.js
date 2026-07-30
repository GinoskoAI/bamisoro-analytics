import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { google } from 'googleapis';
import { GoogleAIFileManager, GoogleGenAI } from '@google/genai';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(req) {
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

    // 2. Fetch Audio from IvozProvider
    const audioRes = await fetch(`https://your-ivoz-domain.com/api/v1/recordings/${callId}`, {
      headers: { 'Authorization': `Bearer ${process.env.IVOZ_API_KEY}` }
    });

    if (!audioRes.ok) {
      throw new Error(`Failed to download audio from IvozProvider: ${audioRes.statusText}`);
    }
    
    const tmpFilePath = path.join('/tmp', `${callId}.wav`);
    const fileStream = fs.createWriteStream(tmpFilePath);
    await pipeline(audioRes.body, fileStream);

    // 3. Upload to Google Drive (Safely parsing JSON from environment variables)
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

    // 4. Process Audio with Gemini 2.5 Flash Lite
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fileManager = new GoogleAIFileManager({ apiKey: process.env.GEMINI_API_KEY });

    const geminiUpload = await fileManager.uploadFile(tmpFilePath, {
      mimeType: "audio/wav",
      displayName: `Call_${callId}`
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

    const analytics = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [geminiUpload.file, { text: prompt }],
      config: { responseMimeType: "application/json" }
    });

    const aiData = JSON.parse(analytics.text);

    // 5. Build Merged Bamisoro Analytics Object
    const finalRecord = {
      call_id: callId,
      tenant_id: tenantId,
      agent_ext: agentExt,
      customer_phone: customerPhone,
      drive_link: driveResponse.data.webViewLink,
      ...aiData,
      processed_at: new Date().toISOString()
    };

    console.log("Bamiso Analytics Output:", finalRecord);

    // Cleanup temp file
    if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);

    return NextResponse.json({ success: true, data: finalRecord });

  } catch (error) {
    console.error("Processor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// QStash signature verification ensures unauthorized external users cannot trigger this endpoint
export const POST = verifySignatureAppRouter(handler);
