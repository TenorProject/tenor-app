"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Address } from "viem";

const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000167" as Address;

const ASSOCIATE_TOKENS_ABI = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "tokens", type: "address[]" },
    ],
    name: "associateTokens",
    outputs: [{ name: "responseCode", type: "int64" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const TOKENS = [
  {
    label: "USDC",
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0000000000000000000000000000000000068cda") as Address,
  },
  {
    label: "Security Token",
    address: (process.env.NEXT_PUBLIC_SECURITY_ADDRESS ?? "0xc2dadb01462b766bb2f58c9638b32e97200ca07d") as Address,
  },
];

interface Props {
  open: boolean;
  address: Address;
  onComplete: () => void;
}

function getCacheKey(address: string) {
  return `tenor:token-assoc:${address.toLowerCase()}`;
}

function isAssociationCached(address: string): boolean {
  try {
    return localStorage.getItem(getCacheKey(address)) === "done";
  } catch {
    return false;
  }
}

function cacheAssociation(address: string) {
  try {
    localStorage.setItem(getCacheKey(address), "done");
  } catch {}
}

function evmToEntityNum(evmAddress: string): number | null {
  const hex = evmAddress.toLowerCase().replace("0x", "");
  // Long-zero format: 0x000000000000000000000000000000000006xxxx
  if (hex.length === 40 && hex.startsWith("000000000000000000000000")) {
    return parseInt(hex.slice(24), 16);
  }
  return null;
}

async function getTokenEntityId(tokenAddress: string): Promise<string | null> {
  // Try parsing long-zero address directly
  const entityNum = evmToEntityNum(tokenAddress);
  if (entityNum !== null) return `0.0.${entityNum}`;

  // Full EVM address — look up via contracts endpoint
  try {
    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/contracts/${tokenAddress}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.contract_id ?? null;
  } catch {
    return null;
  }
}

async function checkAssociation(address: string, tokenAddress: string): Promise<boolean> {
  try {
    const accRes = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}`
    );
    if (!accRes.ok) return false;
    const accData = await accRes.json();
    const accountId = accData.account as string;

    const tokRes = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens`
    );
    if (!tokRes.ok) return false;
    const tokData = await tokRes.json();

    const tokenId = await getTokenEntityId(tokenAddress);
    if (!tokenId) return false;

    return (tokData.tokens ?? []).some(
      (t: { token_id: string }) => t.token_id === tokenId
    );
  } catch {
    return false;
  }
}

export function TokenAssociationModal({ open, address, onComplete }: Props) {
  const [missing, setMissing] = useState<typeof TOKENS>([]);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<"idle" | "signing" | "confirming" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    writeContractAsync,
    data: txHash,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isSuccess: txConfirmed,
    isError: txReverted,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Check which tokens need association
  useEffect(() => {
    if (!open || !address) return;

    // Already associated in a previous session
    if (isAssociationCached(address)) {
      onComplete();
      return;
    }

    setChecking(true);
    setStatus("idle");
    setErrorMsg("");
    resetWrite();

    Promise.all(
      TOKENS.map(async (token) => {
        const associated = await checkAssociation(address, token.address);
        return associated ? null : token;
      })
    ).then((results) => {
      const needed = results.filter(Boolean) as typeof TOKENS;
      setMissing(needed);
      setChecking(false);
      if (needed.length === 0) {
        cacheAssociation(address);
        onComplete();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address]);

  // Handle on-chain confirmation
  useEffect(() => {
    if (txConfirmed) {
      cacheAssociation(address);
      setStatus("done");
      setTimeout(onComplete, 1500);
    }
  }, [txConfirmed, address, onComplete]);

  // Handle on-chain revert
  useEffect(() => {
    if (txReverted) {
      const msg = receiptError?.message ?? "Transaction reverted on-chain";
      if (msg.includes("TOKEN_ALREADY_ASSOCIATED") || msg.includes("already associated")) {
        cacheAssociation(address);
        setStatus("done");
        setTimeout(onComplete, 1000);
      } else {
        setStatus("error");
        setErrorMsg(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
      }
    }
  }, [txReverted, receiptError, address, onComplete]);

  const handleAssociate = useCallback(async () => {
    setStatus("signing");
    setErrorMsg("");
    resetWrite();

    try {
      await writeContractAsync({
        address: HTS_PRECOMPILE,
        abi: ASSOCIATE_TOKENS_ABI,
        functionName: "associateTokens",
        args: [address, missing.map((t) => t.address)],
      });
      // writeContractAsync resolved → tx submitted, now waiting for receipt
      setStatus("confirming");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      // User rejected in wallet
      if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("denied")) {
        setStatus("idle");
        setErrorMsg("Transaction was rejected. You can try again.");
      } else if (msg.includes("TOKEN_ALREADY_ASSOCIATED") || msg.includes("already associated")) {
        cacheAssociation(address);
        setStatus("done");
        setTimeout(onComplete, 1000);
      } else {
        setStatus("error");
        setErrorMsg(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
      }
    }
  }, [address, missing, writeContractAsync, resetWrite, onComplete]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMsg("");
    resetWrite();
  }, [resetWrite]);

  if (!open || checking || missing.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-white">Token Association Required</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your account needs to be associated with the following tokens before you can transact on Hedera.
          </p>
        </div>

        <div className="px-6 space-y-2">
          {missing.map((token) => (
            <div
              key={token.address}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-3"
            >
              <span className="text-sm text-zinc-200 font-medium">{token.label}</span>
              <span className="text-xs text-zinc-500 font-mono">
                {token.address.slice(0, 6)}...{token.address.slice(-4)}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 pt-5 pb-6">
          {(status === "error" || (status === "idle" && errorMsg)) && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
              <p className="text-sm text-red-400">{errorMsg}</p>
            </div>
          )}

          {status === "done" ? (
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-center">
              <p className="text-sm text-zinc-300">Tokens associated successfully.</p>
            </div>
          ) : (
            <>
              <button
                onClick={status === "error" ? handleRetry : handleAssociate}
                disabled={status === "signing" || status === "confirming"}
                className="w-full rounded-md bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {status === "signing"
                  ? "Waiting for signature..."
                  : status === "confirming"
                    ? "Confirming transaction..."
                    : status === "error"
                      ? "Retry"
                      : `Associate ${missing.length} Token${missing.length > 1 ? "s" : ""}`}
              </button>

              <button
                onClick={onComplete}
                disabled={status === "signing" || status === "confirming"}
                className="mt-2 w-full rounded-md px-6 py-2 text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
