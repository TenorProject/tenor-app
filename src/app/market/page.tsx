"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import Link from "next/link";
import type { BorrowRequest } from "@/lib/db";

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

export default function MarketPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [minPrincipal, setMinPrincipal] = useState("");
  const [maxPrincipal, setMaxPrincipal] = useState("");
  const [minMaturity, setMinMaturity] = useState("");
  const [maxMaturity, setMaxMaturity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  function fetchRequests() {
    setLoading(true);
    const params = new URLSearchParams({ status: "open" });
    if (minPrincipal) params.set("minPrincipal", minPrincipal);
    if (maxPrincipal) params.set("maxPrincipal", maxPrincipal);
    if (minMaturity) params.set("minMaturityDays", minMaturity);
    if (maxMaturity) params.set("maxMaturityDays", maxMaturity);

    fetch(`/api/borrow-requests?${params}`)
      .then((r) => r.json())
      .then((data: BorrowRequest[]) => setRequests(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    fetchRequests();
  }

  function handleClearFilters() {
    setMinPrincipal("");
    setMaxPrincipal("");
    setMinMaturity("");
    setMaxMaturity("");
    setShowFilters(false);
    // Fetch without filters
    setLoading(true);
    fetch("/api/borrow-requests?status=open")
      .then((r) => r.json())
      .then((data: BorrowRequest[]) => setRequests(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Open borrow requests from borrowers looking for lenders.
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
        >
          {showFilters ? "Hide Filters" : "Filters"}
        </button>
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
          <p className="text-sm text-zinc-500">No open borrow requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 space-y-3 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">Borrower</span>
                  <span className="font-mono text-zinc-300">{truncAddr(req.borrower)}</span>
                </div>
                <span className="text-xs text-zinc-600">{timeAgo(req.createdAt)}</span>
              </div>

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

              <div className="pt-1">
                <Link
                  href={`/sign-quote?borrower=${req.borrower}&security=${req.security}&collateralQty=${req.collateralQty}&cash=${req.cash}&principal=${req.principal}&maturityDays=${req.maturityDays}&haircutBps=${req.haircutBps}`}
                  className="inline-block rounded-md border border-zinc-800 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
                >
                  Create Quote
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
