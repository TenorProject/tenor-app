"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import type { BorrowRequest, UserProfile } from "@/lib/db";

type EnrichedRequest = BorrowRequest & { profile: UserProfile | null };

interface PaginatedResponse {
  data: EnrichedRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function truncAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatUSDC(raw: string) {
  return formatUnits(BigInt(raw || "0"), 6);
}

function timeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PAGE_SIZE = 10;

export default function MarketPage() {
  const { address, isConnected } = useAuth();
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // My Requests mode
  const [myRequests, setMyRequests] = useState(false);

  // Filters
  const [minPrincipal, setMinPrincipal] = useState("");
  const [maxPrincipal, setMaxPrincipal] = useState("");
  const [minMaturity, setMinMaturity] = useState("");
  const [maxMaturity, setMaxMaturity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  function fetchRequests(
    p = page,
    mine = myRequests,
    filters?: { minP?: string; maxP?: string; minM?: string; maxM?: string },
  ) {
    setLoading(true);
    const fMinP = filters?.minP ?? minPrincipal;
    const fMaxP = filters?.maxP ?? maxPrincipal;
    const fMinM = filters?.minM ?? minMaturity;
    const fMaxM = filters?.maxM ?? maxMaturity;

    const params = new URLSearchParams({
      page: String(p),
      pageSize: String(PAGE_SIZE),
    });

    if (mine && address) {
      params.set("borrower", address);
    } else {
      params.set("status", "pending");
    }

    if (fMinP) params.set("minPrincipal", fMinP);
    if (fMaxP) params.set("maxPrincipal", fMaxP);
    if (fMinM) params.set("minMaturityDays", fMinM);
    if (fMaxM) params.set("maxMaturityDays", fMaxM);

    fetch(`/api/borrow-requests?${params}`)
      .then((r) => r.json())
      .then((res: PaginatedResponse) => {
        setRequests(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.totalPages ?? 1);
        setTotal(res.total ?? 0);
        setPage(res.page ?? 1);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRequests(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggleMyRequests() {
    const next = !myRequests;
    setMyRequests(next);
    setPage(1);
    fetchRequests(1, next);
  }

  function handleApplyFilters() {
    setPage(1);
    fetchRequests(1, myRequests);
  }

  function handleClearFilters() {
    setMinPrincipal("");
    setMaxPrincipal("");
    setMinMaturity("");
    setMaxMaturity("");
    setShowFilters(false);
    setPage(1);
    fetchRequests(1, myRequests, { minP: "", maxP: "", minM: "", maxM: "" });
  }

  function goToPage(p: number) {
    setPage(p);
    fetchRequests(p);
  }

  async function handleCancel(id: number) {
    if (!address) return;
    setCancelingId(id);
    try {
      const res = await fetch("/api/borrow-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "canceled", borrower: address }),
      });
      if (res.ok) {
        fetchRequests(page);
      }
    } finally {
      setCancelingId(null);
    }
  }

  const isOwner = (borrower: string) =>
    address && borrower.toLowerCase() === address.toLowerCase();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {myRequests ? "My Requests" : "Market"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {myRequests
              ? "Your borrow requests across all statuses."
              : "Open borrow requests from borrowers looking for lenders."}
            {total > 0 && <span className="text-zinc-600"> ({total} total)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={handleToggleMyRequests}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                myRequests
                  ? "border-zinc-600 bg-zinc-800 text-white"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {myRequests ? "All Requests" : "My Requests"}
            </button>
          )}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
          >
            {showFilters ? "Hide Filters" : "Filters"}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Min Principal (raw)</span>
              <input
                type="text"
                value={minPrincipal}
                onChange={(e) => setMinPrincipal(e.target.value)}
                placeholder="e.g. 1000000000"
                className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Max Principal (raw)</span>
              <input
                type="text"
                value={maxPrincipal}
                onChange={(e) => setMaxPrincipal(e.target.value)}
                placeholder="e.g. 100000000000"
                className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Min Maturity (days)</span>
              <input
                type="number"
                value={minMaturity}
                onChange={(e) => setMinMaturity(e.target.value)}
                placeholder="1"
                className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Max Maturity (days)</span>
              <input
                type="number"
                value={maxMaturity}
                onChange={(e) => setMaxMaturity(e.target.value)}
                placeholder="30"
                className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyFilters}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-all"
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Request list */}
      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
          <p className="text-sm text-zinc-500">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
          <p className="text-sm text-zinc-500">
            {myRequests ? "You have no borrow requests." : "No open borrow requests."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`rounded-xl border bg-zinc-900/30 p-5 space-y-3 transition-colors ${
                  req.status === "canceled"
                    ? "border-zinc-800/40 opacity-60"
                    : req.status === "confirmed"
                      ? "border-zinc-700"
                      : "border-zinc-800/60 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {req.profile ? (
                      <>
                        <span className="text-zinc-200 font-medium">{req.profile.displayName}</span>
                        <span className="font-mono text-zinc-500 text-xs">{truncAddr(req.borrower)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-zinc-500">Borrower</span>
                        <span className="font-mono text-zinc-300">{truncAddr(req.borrower)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {myRequests && req.status !== "pending" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          req.status === "confirmed"
                            ? "bg-zinc-800 text-zinc-300"
                            : "bg-zinc-800/50 text-zinc-500"
                        }`}
                      >
                        {req.status}
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">{timeAgo(req.createdAt)}</span>
                  </div>
                </div>

                {req.profile && (req.profile.telegram || req.profile.twitter) && (
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {req.profile.telegram && (
                      <a
                        href={`https://t.me/${req.profile.telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-zinc-300 transition-colors"
                      >
                        Telegram @{req.profile.telegram}
                      </a>
                    )}
                    {req.profile.twitter && (
                      <a
                        href={`https://x.com/${req.profile.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-zinc-300 transition-colors"
                      >
                        X @{req.profile.twitter}
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-zinc-500">Principal</span>
                    <p className="text-zinc-200 font-mono">{formatUSDC(req.principal)} USDC</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Maturity</span>
                    <p className="text-zinc-300">{req.maturityDays} days</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Haircut</span>
                    <p className="text-zinc-300">{(req.haircutBps / 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Collateral</span>
                    <p className="text-zinc-300 font-mono">{req.collateralQty}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-zinc-500">Security</span>
                    <p className="text-zinc-300 font-mono text-xs">{truncAddr(req.security)}</p>
                  </div>
                </div>

                {req.note && (
                  <p className="text-sm text-zinc-500 italic">{req.note}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {req.status === "pending" && !isOwner(req.borrower) && (
                    <Link
                      href={`/sign-quote?borrowRequestId=${req.id}&borrower=${req.borrower}&security=${req.security}&collateralQty=${req.collateralQty}&cash=${req.cash}&principal=${req.principal}&maturityDays=${req.maturityDays}&haircutBps=${req.haircutBps}`}
                      className="inline-block rounded-md border border-zinc-800 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      Create Quote
                    </Link>
                  )}
                  {req.status === "pending" && isOwner(req.borrower) && (
                    <button
                      onClick={() => handleCancel(req.id)}
                      disabled={cancelingId === req.id}
                      className="rounded-md border border-zinc-800 px-4 py-1.5 text-sm text-red-400 hover:border-red-500/30 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {cancelingId === req.id ? "Canceling..." : "Cancel Request"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`dot-${i}`} className="px-1 text-zinc-600 text-sm">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item)}
                        className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                          item === page
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
