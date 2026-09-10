"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, type Address, type Hex } from "viem";
import { useOpenRepo } from "@/hooks/useTenor";
import { publishToHcs } from "@/lib/hcs";
import type { Quote } from "@/types/tenor";
import type { SignedQuote, QuotePayload } from "@/types/quote-api";

function payloadToQuote(p: QuotePayload): Quote {
  return {
    requestId: p.requestId,
    lender: p.lender,
    borrower: p.borrower,
    security: p.security,
    partition: p.partition,
    collateralQty: BigInt(p.collateralQty),
    cash: p.cash,
    principal: BigInt(p.principal),
    repurchase: BigInt(p.repurchase),
    maturity: BigInt(p.maturity),
    quoteExpiry: BigInt(p.quoteExpiry),
    haircutBps: BigInt(p.haircutBps),
  };
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUSDC(raw: string) {
  return formatUnits(BigInt(raw), 6);
}

function formatDate(unixStr: string) {
  return new Date(Number(unixStr) * 1000).toLocaleString();
}

function QuoteCard({
  signed,
  onExecute,
  isActive,
  txHash,
  isPending,
  isError,
  error,
}: {
  signed: SignedQuote;
  onExecute: () => void;
  isActive: boolean;
  txHash: Hex | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}) {
  const { quote } = signed;
  const nowSec = Math.floor(Date.now() / 1000);
  const expired = Number(quote.quoteExpiry) < nowSec;
  const bpsPercent = (Number(quote.haircutBps) / 100).toFixed(2);

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, data: receipt } = useWaitForTransactionReceipt({
    hash: isActive ? txHash : undefined,
  });
  const isReverted = isReceiptError || receipt?.status === "reverted";

  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 space-y-4 transition-colors ${
        expired
          ? "border-zinc-800/40 bg-zinc-900/20 opacity-40"
          : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-600" />
          <span className="text-sm text-zinc-400">
            Lender{" "}
            <span className="font-mono text-zinc-300">
              {truncateAddress(quote.lender)}
            </span>
          </span>
        </div>
        {expired && (
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500">
            Expired
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="text-xs text-zinc-500">Principal</span>
          <p className="text-zinc-200 font-mono">{formatUSDC(quote.principal)} USDC</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Repurchase</span>
          <p className="text-zinc-200 font-mono">{formatUSDC(quote.repurchase)} USDC</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Maturity</span>
          <p className="text-zinc-300">{formatDate(quote.maturity)}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Haircut</span>
          <p className="text-zinc-300">{bpsPercent}%</p>
        </div>
        <div className="col-span-2">
          <span className="text-xs text-zinc-500">Quote Expiry</span>
          <p className="text-zinc-300">{formatDate(quote.quoteExpiry)}</p>
        </div>
      </div>

      <div className="pt-1">
        <button
          onClick={onExecute}
          disabled={expired || isPending || (isActive && isConfirming)}
          className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isActive && isPending
            ? "Waiting for wallet..."
            : isActive && isConfirming
              ? "Confirming..."
              : "Execute"}
        </button>

        {isActive && isSuccess && !isReverted && txHash && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
            <p className="text-sm text-emerald-400">
              Confirmed{" "}
              <a
                href={`https://hashscan.io/testnet/transaction/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-mono text-xs break-all"
              >
                {txHash}
              </a>
            </p>
          </div>
        )}
        {isActive && isReverted && txHash && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
            <p className="text-sm text-red-400">
              Transaction reverted on-chain.{" "}
              <a
                href={`https://hashscan.io/testnet/transaction/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-mono text-xs text-red-300"
              >
                View on HashScan
              </a>
            </p>
          </div>
        )}
        {isActive && isError && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
            <p className="text-sm text-red-400">
              {decodeErrorName(error)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function decodeErrorName(error: Error | null): string {
  if (!error) return "Transaction failed.";
  const msg = error.message;
  const knownErrors = [
    "QuoteExpired",
    "BadSignature",
    "CashLegFailed",
    "AlreadyExists",
    "MaturityInPast",
    "NotBorrower",
    "QuoteWasCancelled",
    "InsufficientHbarForUnwind",
    "NoScheduleCapacity",
    "ScheduleFailed",
    "NotOpen",
  ];
  for (const name of knownErrors) {
    if (msg.includes(name)) return name;
  }
  if (msg.length > 200) return msg.slice(0, 200) + "...";
  return msg;
}

export default function OpenRepoPage() {
  const { address, isConnected } = useAccount();
  const [quotes, setQuotes] = useState<SignedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const activeQuoteRef = useRef<QuotePayload | null>(null);

  const { openRepo, txHash, isPending, isError, error } = useOpenRepo();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Fire-and-forget HCS publish when openRepo tx confirms
  const hcsPublished = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isSuccess && txHash && hcsPublished.current !== txHash && activeQuoteRef.current) {
      hcsPublished.current = txHash;
      const q = activeQuoteRef.current;
      publishToHcs(
        `RepoOpened | id=${q.requestId} | lender=${q.lender} | borrower=${q.borrower} | principal=${q.principal} | maturity=${q.maturity}`,
      );
    }
  }, [isSuccess, txHash]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/quotes?borrower=${address}`)
      .then((r) => r.json())
      .then((data: SignedQuote[]) => setQuotes(data))
      .finally(() => setLoading(false));
  }, [address]);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-zinc-600">
            <svg viewBox="0 0 24 24" className="h-10 w-10 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-zinc-400">Connect your wallet to view available quotes.</p>
        </div>
      </div>
    );
  }

  function handleExecute(signed: SignedQuote) {
    setActiveRequestId(signed.quote.requestId);
    activeQuoteRef.current = signed.quote;
    const quote = payloadToQuote(signed.quote);
    openRepo(quote, signed.signature);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Open Repo</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Quotes addressed to{" "}
          <span className="font-mono text-zinc-400">{truncateAddress(address)}</span>.
          Execute a quote to open the repo on-chain.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading quotes...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
          <p className="text-sm text-zinc-500">No quotes available for your address.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((sq) => (
            <QuoteCard
              key={sq.quote.requestId}
              signed={sq}
              onExecute={() => handleExecute(sq)}
              isActive={activeRequestId === sq.quote.requestId}
              txHash={activeRequestId === sq.quote.requestId ? txHash : undefined}
              isPending={activeRequestId === sq.quote.requestId && isPending}
              isError={activeRequestId === sq.quote.requestId && isError}
              error={activeRequestId === sq.quote.requestId ? error : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
