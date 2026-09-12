import { NextRequest, NextResponse } from "next/server";
import type { QuotePayload } from "@/types/quote-api";
import type { Hex } from "viem";
import {
  insertQuote,
  getAllQuotes,
  getQuotesByBorrower,
  getQuotesByLender,
  updateBorrowRequestStatus,
} from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    quote: QuotePayload;
    signature: Hex;
    borrowRequestId?: number;
  };

  const { quote, signature, borrowRequestId } = body;

  if (!quote?.requestId || !signature) {
    return NextResponse.json(
      { error: "Missing quote or signature" },
      { status: 400 },
    );
  }

  insertQuote(quote, signature);

  // Mark the borrow request as confirmed if linked
  if (borrowRequestId) {
    updateBorrowRequestStatus(borrowRequestId, "confirmed");
  }

  return NextResponse.json({ requestId: quote.requestId }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const borrower = searchParams.get("borrower");
  const lender = searchParams.get("lender");

  let results;
  if (borrower) {
    results = getQuotesByBorrower(borrower);
  } else if (lender) {
    results = getQuotesByLender(lender);
  } else {
    results = getAllQuotes();
  }

  return NextResponse.json(results);
}
