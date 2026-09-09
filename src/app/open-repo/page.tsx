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

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: isActive ? txHash : undefined,
  });

  return (
    <div
      className={`rounded-lg border p-5 space-y-3 ${
        expired
          ? "border-zinc-700 bg-zinc-900/50 opacity-50"
          : "border-zinc-700 bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          Lender:{" "}
          <span className="font-mono text-zinc-200">
            {truncateAddress(quote.lender)}
          </span>
        </span>
        {expired && (
          <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            Expired
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div className="text-zinc-400">
          Principal:{" "}
          <span className="text-zinc-200">{formatUSDC(quote.principal)} USDC</span>
        </div>
        <div className="text-zinc-400">
          Repurchase:{" "}
          <span className="text-zinc-200">{formatUSDC(quote.repurchase)} USDC</span>
        </div>
        <div className="text-zinc-400">
          Maturity:{" "}
          <span className="text-zinc-200">{formatDate(quote.maturity)}</span>
        </div>
        <div className="text-zinc-400">
          Haircut:{" "}
          <span className="text-zinc-200">{bpsPercent}%</span>
        </div>
        <div className="text-zinc-400 col-span-2">
          Quote Expiry:{" "}
          <span className="text-zinc-200">{formatDate(quote.quoteExpiry)}</span>
        </div>
      </div>

      <div className="pt-1">
        <button
          onClick={onExecute}
          disabled={expired || isPending || (isActive && isConfirming)}
          className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isActive && isPending
            ? "Waiting for wallet..."
            : isActive && isConfirming
              ? "Confirming..."
              : "Execute"}
        </button>

        {isActive && isSuccess && txHash && (
          <p className="mt-2 text-sm text-emerald-400">
            Confirmed:{" "}
            <a
              href={`https://hashscan.io/testnet/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-mono text-xs break-all"
            >
              {txHash}
            </a>
          </p>
        )}
        {isActive && isError && (
          <p className="mt-2 text-sm text-red-400">
            {decodeErrorName(error)}
          </p>
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
        <p className="text-zinc-400">Connect your wallet to view available quotes.</p>
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
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-white">Open Repo</h1>
      <p className="text-sm text-zinc-400">
        Quotes addressed to{" "}
        <span className="font-mono text-zinc-300">{truncateAddress(address)}</span>.
        Execute a quote to open the repo on-chain.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading quotes...</p>
      ) : quotes.length === 0 ? (
        <p className="text-sm text-zinc-500">No quotes available for your address.</p>
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
