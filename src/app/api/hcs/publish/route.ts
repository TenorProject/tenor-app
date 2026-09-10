import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

function getClient() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set");
  }

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromStringECDSA(operatorKey),
  );
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      topicId?: string;
      message: string;
    };

    const topicIdStr =
      body.topicId ?? process.env.NEXT_PUBLIC_HCS_TOPIC_ID ?? "";
    if (!topicIdStr || !body.message) {
      return NextResponse.json(
        { error: "Missing topicId or message" },
        { status: 400 },
      );
    }

    const client = getClient();
    const topicId = TopicId.fromString(topicIdStr);

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(body.message);

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    return NextResponse.json(
      {
        status: receipt.status.toString(),
        sequenceNumber: receipt.topicSequenceNumber?.toString() ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
