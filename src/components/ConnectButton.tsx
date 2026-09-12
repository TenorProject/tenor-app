"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useState, useRef, useEffect } from "react";

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Always set the Privy embedded wallet as active for wagmi
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  useEffect(() => {
    if (embeddedWallet && address && embeddedWallet.address.toLowerCase() !== address.toLowerCase()) {
      setActiveWallet(embeddedWallet);
    }
  }, [embeddedWallet, address, setActiveWallet]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!ready) return null;

  if (authenticated && address) {
    const activeAddress = embeddedWallet?.address ?? address;
    const truncated = `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`;
    const bal = balance
      ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(2)} ${balance.symbol}`
      : "";

    const label = user?.google?.email ?? user?.email?.address ?? truncated;

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs truncate max-w-[140px]">{label}</span>
          {bal && <span className="text-zinc-500 text-xs">({bal})</span>}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl z-50">
            <div className="px-3 py-2 text-xs text-zinc-500 font-mono truncate border-b border-zinc-800 mb-1">
              {activeAddress}
            </div>
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="group relative rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98]"
    >
      <span className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Sign In
      </span>
    </button>
  );
}
