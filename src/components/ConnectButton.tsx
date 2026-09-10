"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatUnits } from "viem";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (isConnected && address) {
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const bal = balance
      ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(2)} ${balance.symbol}`
      : "";

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs">{truncated}</span>
          {bal && <span className="text-zinc-500 text-xs">({bal})</span>}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl z-50">
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Deduplicate by name and filter out Solana-related wallets
  const SOLANA_NAMES = /phantom|solflare|backpack|glow|solana/i;
  const unique = connectors
    .filter((c) => !SOLANA_NAMES.test(c.name))
    .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i);

  if (unique.length === 1) {
    return (
      <button
        onClick={() => connect({ connector: unique[0] })}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-all"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-all"
      >
        Connect Wallet
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl z-50">
          {unique.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
