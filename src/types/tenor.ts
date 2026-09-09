import type { Address, Hex } from "viem";

export const RepoStatus = {
  None: 0,
  Open: 1,
  Closed: 2,
  Defaulted: 3,
} as const;

export type RepoStatus = (typeof RepoStatus)[keyof typeof RepoStatus];

export const RepoStatusLabel: Record<RepoStatus, string> = {
  [RepoStatus.None]: "None",
  [RepoStatus.Open]: "Open",
  [RepoStatus.Closed]: "Closed",
  [RepoStatus.Defaulted]: "Defaulted",
};

export interface Quote {
  requestId: Hex;
  lender: Address;
  borrower: Address;
  security: Address;
  partition: Hex;
  collateralQty: bigint;
  cash: Address;
  principal: bigint;
  repurchase: bigint;
  maturity: bigint;
  quoteExpiry: bigint;
  haircutBps: bigint;
}

export interface Repo {
  lender: Address;
  borrower: Address;
  security: Address;
  partition: Hex;
  collateralQty: bigint;
  cash: Address;
  principal: bigint;
  repurchase: bigint;
  maturity: bigint;
  haircutBps: bigint;
  closeHoldId: bigint;
  scheduleAddress: Address;
  status: RepoStatus;
}
