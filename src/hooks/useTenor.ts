"use client";

import { useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import { TENOR_SETTLEMENT_ABI, TENOR_SETTLEMENT_ADDRESS } from "@/abi";
import { RepoStatus, type Quote, type Repo } from "@/types/tenor";

const contractConfig = {
  address: TENOR_SETTLEMENT_ADDRESS,
  abi: TENOR_SETTLEMENT_ABI,
} as const;

// ── Reads ─────────────────────────────────────────────────

export function useRepo(id: Hex | undefined) {
  const result = useReadContract({
    ...contractConfig,
    functionName: "repos",
    args: id ? [id] : undefined,
    query: { enabled: !!id },
  });

  const data = result.data;
  const repo: Repo | undefined = data
    ? {
        lender: data[0],
        borrower: data[1],
        security: data[2],
        partition: data[3],
        collateralQty: data[4],
        cash: data[5],
        principal: data[6],
        repurchase: data[7],
        maturity: BigInt(data[8]),
        haircutBps: data[9],
        closeHoldId: data[10],
        scheduleAddress: data[11],
        status: data[12] as RepoStatus,
      }
    : undefined;

  return { ...result, data: repo };
}

export function useRepoStatus(id: Hex | undefined) {
  const result = useReadContract({
    ...contractConfig,
    functionName: "repos",
    args: id ? [id] : undefined,
    query: { enabled: !!id },
  });

  const status: RepoStatus | undefined = result.data
    ? (result.data[12] as RepoStatus)
    : undefined;

  return { ...result, data: status };
}

export function useQuoteCancelled(
  lender: Address | undefined,
  requestId: Hex | undefined,
) {
  return useReadContract({
    ...contractConfig,
    functionName: "quoteCancelled",
    args: lender && requestId ? [lender, requestId] : undefined,
    query: { enabled: !!lender && !!requestId },
  });
}

export function useHashQuote(quote: Quote | undefined) {
  return useReadContract({
    ...contractConfig,
    functionName: "hashQuote",
    args: quote ? [quote] : undefined,
    query: { enabled: !!quote },
  });
}

// ── Writes ────────────────────────────────────────────────

export function useOpenRepo() {
  const { writeContract, data: txHash, ...rest } = useWriteContract();

  function openRepo(quote: Quote, signature: Hex) {
    writeContract({
      ...contractConfig,
      functionName: "openRepo",
      args: [quote, signature],
    });
  }

  return { openRepo, txHash, ...rest };
}

export function useRepayEarly() {
  const { writeContract, data: txHash, ...rest } = useWriteContract();

  function repayEarly(id: Hex) {
    writeContract({
      ...contractConfig,
      functionName: "repayEarly",
      args: [id],
    });
  }

  return { repayEarly, txHash, ...rest };
}

export function useCancelQuote() {
  const { writeContract, data: txHash, ...rest } = useWriteContract();

  function cancelQuote(requestId: Hex) {
    writeContract({
      ...contractConfig,
      functionName: "cancelQuote",
      args: [requestId],
    });
  }

  return { cancelQuote, txHash, ...rest };
}
