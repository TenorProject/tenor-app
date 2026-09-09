import { NextRequest, NextResponse } from "next/server";

interface MirrorMessage {
  consensus_timestamp: string;
  sequence_number: number;
  message: string;
}

interface MirrorResponse {
  messages: MirrorMessage[];
  links?: { next?: string };
}

export interface HcsMessage {
  sequenceNumber: number;
  timestamp: string;
  content: string;
}

export async function GET(request: NextRequest) {
  const topicId =
    request.nextUrl.searchParams.get("topicId") ??
    process.env.NEXT_PUBLIC_HCS_TOPIC_ID ??
    "";

  if (!topicId) {
    return NextResponse.json(
      { error: "Missing topicId" },
      { status: 400 },
    );
  }

  const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=50&order=desc`;

  const res = await fetch(url, { next: { revalidate: 5 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Mirror node returned ${res.status}` },
      { status: 502 },
    );
  }

  const body = (await res.json()) as MirrorResponse;

  const messages: HcsMessage[] = (body.messages ?? []).map((m) => ({
    sequenceNumber: m.sequence_number,
    timestamp: m.consensus_timestamp,
    content: Buffer.from(m.message, "base64").toString("utf-8"),
  }));

  return NextResponse.json(messages);
}
