export const dynamic = 'force-dynamic'; // Prevents Next.js from caching this webhook at build time

import { Client } from "@upstash/qstash";
import { NextResponse } from 'next/server';

const qstash = new Client({ token: process.env.QSTASH_TOKEN });

export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Instantly forward the IvozProvider payload to the processor via QStash
    await qstash.publishJSON({
      url: `https://${process.env.VERCEL_URL}/api/webhook/processor`,
      body: body,
    });

    // 2. Return 200 OK instantly so the IvozProvider webhook doesn't time out
    return NextResponse.json({ success: true, status: "Queued" }, { status: 200 });
  } catch (error) {
    console.error("Receiver error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
