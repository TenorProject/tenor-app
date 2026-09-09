import type { Address, Hex } from "viem";

export interface RepoFromEvent {
  id: Hex;
  lender: Address;
  borrower: Address;
  security: Address;
  collateralQty: string;
  cash: Address;
  principal: string;
  repurchase: string;
  maturity: string;
  scheduleAddress: Address;
}
