"use client";

import { useEffect, useRef, useState } from "react";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { formatUnits, type Hex } from "viem";
import { TENOR_SETTLEMENT_ABI, TENOR_SETTLEMENT_ADDRESS } from "@/abi";
import { useRepayEarly } from "@/hooks/useTenor";
import { publishToHcs } from "@/lib/hcs";
import { RepoStatus, RepoStatusLabel } from "@/types/tenor";
import type { RepoFromEvent } from "@/types/repo-api";

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUSDC(raw: string) {
  return formatUnits(BigInt(raw), 6);
}

// ── Countdown ────────────────────────────────────────────

function useCountdown(maturityUnix: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = maturityUnix - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return { days, hours, minutes, seconds };
}

function CountdownDisplay({ maturityUnix }: { maturityUnix: number }) {
  const remaining = useCountdown(maturityUnix);

  if (!remaining) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-yellow-400 font-medium text-sm">
          Maturity reached, awaiting settlement
        </span>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = remaining;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex gap-3 font-mono text-lg text-white">
      {days > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-xl font-semibold">{days}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">days</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className="text-xl font-semibold">{pad(hours)}</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">hrs</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xl font-semibold">{pad(minutes)}</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">min</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xl font-semibold tabular-nums">{pad(seconds)}</span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">sec</span>
      </div>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────

const STATUS_COLORS: Record<RepoStatus, string> = {
  [RepoStatus.None]: "bg-zinc-800 text-zinc-400",
  [RepoStatus.Open]: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  [RepoStatus.Closed]: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  [RepoStatus.Defaulted]: "bg-red-500/10 text-red-400 border border-red-500/20",
};

function StatusBadge({ status }: { status: RepoStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {RepoStatusLabel[status]}
    </span>
  );
}

// ── Repo Card ────────────────────────────────────────────

function RepoCard({
  repo,
  connectedAddress,
}: {
  repo: RepoFromEvent;
  connectedAddress: string;
}) {
  const isLender = repo.lender.toLowerCase() === connectedAddress.toLowerCase();
  const isBorrower = repo.borrower.toLowerCase() === connectedAddress.toLowerCase();
  const counterparty = isLender ? repo.borrower : repo.lender;
  const counterpartyLabel = isLender ? "Borrower" : "Lender";
  const maturityUnix = Number(repo.maturity);

  const { data: onChainData } = useReadContract({
    address: TENOR_SETTLEMENT_ADDRESS,
    abi: TENOR_SETTLEMENT_ABI,
    functionName: "repos",
    args: [repo.id as Hex],
  });

  const status: RepoStatus = onChainData
    ? (onChainData[12] as RepoStatus)
    : RepoStatus.None;

  const { repayEarly, txHash, isPending, isError, error } = useRepayEarly();
  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });
  const isReverted = isReceiptError || receipt?.status === "reverted";

  // Fire-and-forget HCS publish when repayEarly tx confirms
  const hcsPublished = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isSuccess && txHash && hcsPublished.current !== txHash) {
      hcsPublished.current = txHash;
      publishToHcs(
        `RepoRepaidEarly | id=${repo.id} | repaidAt=${Math.floor(Date.now() / 1000)}`,
      );
    }
  }, [isSuccess, txHash, repo.id]);

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 sm:p-6 space-y-4 transition-colors hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="text-xs text-zinc-600 font-mono">{truncAddr(repo.id)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span>{counterpartyLabel}:</span>
        <span className="font-mono text-zinc-300">{truncAddr(counterparty)}</span>
        {isLender && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">you are lender</span>}
        {isBorrower && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">you are borrower</span>}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="text-xs text-zinc-500">Principal</span>
          <p className="text-zinc-200 font-mono">{formatUSDC(repo.principal)} USDC</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Repurchase</span>
          <p className="text-zinc-200 font-mono">{formatUSDC(repo.repurchase)} USDC</p>
        </div>
        <div className="col-span-2">
          <span className="text-xs text-zinc-500">Maturity</span>
          <p className="text-zinc-300">{new Date(maturityUnix * 1000).toLocaleString()}</p>
        </div>
      </div>

      {status === RepoStatus.Open && (
        <div className="rounded-lg bg-zinc-800/30 px-4 py-3">
          <span className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Time remaining</span>
          <CountdownDisplay maturityUnix={maturityUnix} />
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Schedule:</span>
        <a
          href={`https://hashscan.io/testnet/schedule/${repo.scheduleAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors"
        >
          {truncAddr(repo.scheduleAddress)}
        </a>
      </div>

      {status === RepoStatus.Open && isBorrower && (
        <div className="pt-1 border-t border-zinc-800/40">
          <button
            onClick={() => repayEarly(repo.id as Hex)}
            disabled={isPending || isConfirming}
            className="mt-3 rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending
              ? "Waiting for wallet..."
              : isConfirming
                ? "Confirming..."
                : "Repay Early"}
          </button>

          {isSuccess && !isReverted && txHash && (
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
          {isReverted && txHash && (
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
          {isError && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
              <p className="text-sm text-red-400">
                {error?.message?.slice(0, 200) ?? "Transaction failed."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────

export default function DashboardPage() {
  const { address, isConnected } = useAuth();
  const [repos, setRepos] = useState<RepoFromEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/repos?address=${address}`)
      .then((r) => r.json())
      .then((data: RepoFromEvent[]) => setRepos(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [address]);

  if (!isConnected || !address) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-zinc-600">
            <svg viewBox="0 0 24 24" className="h-10 w-10 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <path d="M2 9h20M10 3v6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-zinc-400">Connect your wallet to view your repos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Repos involving{" "}
          <span className="font-mono text-zinc-400">{truncAddr(address)}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading repos...</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
          <p className="text-sm text-zinc-500">No repos found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} connectedAddress={address} />
          ))}
        </div>
      )}
    </div>
  );
}
