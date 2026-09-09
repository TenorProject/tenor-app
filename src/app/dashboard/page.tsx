"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
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
      <span className="text-yellow-400 font-medium text-sm">
        Maturity reached — awaiting settlement
      </span>
    );
  }

  const { days, hours, minutes, seconds } = remaining;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex gap-2 font-mono text-lg text-white">
      {days > 0 && (
        <span>
          {days}<span className="text-xs text-zinc-400 ml-0.5">d</span>
        </span>
      )}
      <span>
        {pad(hours)}<span className="text-xs text-zinc-400 ml-0.5">h</span>
      </span>
      <span>
        {pad(minutes)}<span className="text-xs text-zinc-400 ml-0.5">m</span>
      </span>
      <span>
        {pad(seconds)}<span className="text-xs text-zinc-400 ml-0.5">s</span>
      </span>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────

const STATUS_COLORS: Record<RepoStatus, string> = {
  [RepoStatus.None]: "bg-zinc-700 text-zinc-300",
  [RepoStatus.Open]: "bg-blue-600/20 text-blue-400 border border-blue-500/30",
  [RepoStatus.Closed]: "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30",
  [RepoStatus.Defaulted]: "bg-red-600/20 text-red-400 border border-red-500/30",
};

function StatusBadge({ status }: { status: RepoStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
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
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="text-xs text-zinc-500 font-mono">{truncAddr(repo.id)}</span>
      </div>

      <div className="text-sm text-zinc-400">
        {counterpartyLabel}:{" "}
        <span className="font-mono text-zinc-200">{truncAddr(counterparty)}</span>
        {isLender && <span className="ml-2 text-xs text-zinc-500">(you are lender)</span>}
        {isBorrower && <span className="ml-2 text-xs text-zinc-500">(you are borrower)</span>}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div className="text-zinc-400">
          Principal: <span className="text-zinc-200">{formatUSDC(repo.principal)} USDC</span>
        </div>
        <div className="text-zinc-400">
          Repurchase: <span className="text-zinc-200">{formatUSDC(repo.repurchase)} USDC</span>
        </div>
        <div className="text-zinc-400 col-span-2">
          Maturity: <span className="text-zinc-200">{new Date(maturityUnix * 1000).toLocaleString()}</span>
        </div>
      </div>

      {status === RepoStatus.Open && (
        <div className="pt-1">
          <CountdownDisplay maturityUnix={maturityUnix} />
        </div>
      )}

      <div className="text-sm text-zinc-400">
        Schedule:{" "}
        <a
          href={`https://hashscan.io/testnet/schedule/${repo.scheduleAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-emerald-400 underline"
        >
          {truncAddr(repo.scheduleAddress)}
        </a>
      </div>

      {status === RepoStatus.Open && isBorrower && (
        <div className="pt-1">
          <button
            onClick={() => repayEarly(repo.id as Hex)}
            disabled={isPending || isConfirming}
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? "Waiting for wallet..."
              : isConfirming
                ? "Confirming..."
                : "Repay Early"}
          </button>

          {isSuccess && txHash && (
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
          {isError && (
            <p className="mt-2 text-sm text-red-400">
              {error?.message?.slice(0, 200) ?? "Transaction failed."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
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
        <p className="text-zinc-400">Connect your wallet to view your repos.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="text-sm text-zinc-400">
        Repos involving{" "}
        <span className="font-mono text-zinc-300">{truncAddr(address)}</span>
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading repos...</p>
      ) : repos.length === 0 ? (
        <p className="text-sm text-zinc-500">No repos found.</p>
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
