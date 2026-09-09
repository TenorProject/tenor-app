import { NextRequest, NextResponse } from "next/server";
import type { SignedQuote, QuotePayload } from "@/types/quote-api";
import type { Hex } from "viem";

const quotes = new Map<string, SignedQuote>();

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    quote: QuotePayload;
    signature: Hex;
  };

  const { quote, signature } = body;

  if (!quote?.requestId || !signature) {
    return NextResponse.json(
      { error: "Missing quote or signature" },
      { status: 400 },
    );
  }

  const entry: SignedQuote = {
    quote,
    signature,
    createdAt: Date.now(),
  };

  quotes.set(quote.requestId, entry);

  return NextResponse.json({ requestId: quote.requestId }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const borrower = searchParams.get("borrower")?.toLowerCase();
  const lender = searchParams.get("lender")?.toLowerCase();

  let results = Array.from(quotes.values());

  if (borrower) {
    results = results.filter(
      (q) => q.quote.borrower.toLowerCase() === borrower,
    );
  }
  if (lender) {
    results = results.filter(
      (q) => q.quote.lender.toLowerCase() === lender,
    );
  }

  return NextResponse.json(results);
}
