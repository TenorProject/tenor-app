import type { Address, Hex } from "viem";

/** JSON-safe representation of a Quote (bigints serialized as hex strings). */
export interface QuotePayload {
  requestId: Hex;
  lender: Address;
  borrower: Address;
  security: Address;
  partition: Hex;
  collateralQty: string;
  cash: Address;
  principal: string;
  repurchase: string;
  maturity: string;
  quoteExpiry: string;
  haircutBps: string;
}

export interface SignedQuote {
  quote: QuotePayload;
  signature: Hex;
  createdAt: number;
}
