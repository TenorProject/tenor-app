"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatUnits } from "viem";

const DEFAULT_SECURITY = (process.env.NEXT_PUBLIC_SECURITY_ADDRESS ?? "") as string;
const DEFAULT_CASH = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "") as string;

type Status = "idle" | "submitting" | "done" | "error";

export default function BorrowPage() {
  const { address, isConnected } = useAuth();

  const [security, setSecurity] = useState(DEFAULT_SECURITY);
  const [collateralQty, setCollateralQty] = useState("");
  const [cash, setCash] = useState(DEFAULT_CASH);
  const [principal, setPrincipal] = useState("");
  const [maturityDays, setMaturityDays] = useState("7");
  const [haircutBps, setHaircutBps] = useState("500");
  const [note, setNote] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
          <p className="text-zinc-400">Connect your wallet to submit a borrow request.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/borrow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: address,
          security,
          collateralQty,
          cash,
          principal,
          maturityDays: Number(maturityDays),
          haircutBps: Number(haircutBps),
          note,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      setStatus("done");
      // Reset form
      setCollateralQty("");
      setPrincipal("");
      setNote("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const principalDisplay = principal
    ? formatUnits(BigInt(principal || "0"), 6)
    : "0";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Borrow Request</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Post your borrowing needs. Lenders can browse requests and sign quotes for you.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 sm:p-8 space-y-6">
        {/* Collateral */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Collateral</h3>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Security Token Address</span>
            <input
              type="text"
              value={security}
              onChange={(e) => setSecurity(e.target.value)}
              placeholder="0x..."
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Collateral Quantity (raw units)</span>
            <input
              type="text"
              value={collateralQty}
              onChange={(e) => setCollateralQty(e.target.value)}
              placeholder="e.g. 1000"
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>
        </div>

        <div className="border-t border-zinc-800/40" />

        {/* Loan terms */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Desired Terms</h3>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Cash Token (USDC)</span>
            <input
              type="text"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0x..."
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
                Principal (raw, 6 decimals)
              </span>
              <input
                type="text"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="10000000000 = 10,000 USDC"
                className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
              />
              {principal && (
                <span className="mt-1 block text-xs text-zinc-500">
                  {principalDisplay} USDC
                </span>
              )}
            </label>

            <label className="block text-sm">
              <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Haircut (bps, e.g. 500 = 5%)</span>
              <input
                type="text"
                value={haircutBps}
                onChange={(e) => setHaircutBps(e.target.value)}
                placeholder="500"
                className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Maturity (days)</span>
            <input
              type="number"
              value={maturityDays}
              onChange={(e) => setMaturityDays(e.target.value)}
              min="1"
              className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors"
            />
          </label>
        </div>

        <div className="border-t border-zinc-800/40" />

        {/* Note */}
        <label className="block text-sm">
          <span className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Any additional context for lenders..."
            className="block w-full rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none hover:border-zinc-600 transition-colors resize-none"
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={!collateralQty || !principal || status === "submitting"}
          className="rounded-md bg-white px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>

        {status === "done" && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-3">
            <p className="text-sm text-zinc-300">Request submitted. Lenders can now see it in the market.</p>
          </div>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-400">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
