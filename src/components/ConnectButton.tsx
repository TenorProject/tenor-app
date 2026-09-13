"use client";

import { usePrivy, useWallets, useExportWallet } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useState, useRef, useEffect, useCallback } from "react";
import { KeyConverterModal } from "./KeyConverterModal";
import { ProfileModal } from "./ProfileModal";
import { TokenAssociationModal } from "./TokenAssociationModal";

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { exportWallet } = useExportWallet();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const [open, setOpen] = useState(false);
  const [converterOpen, setConverterOpen] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [needsAssociation, setNeedsAssociation] = useState(false);
  const [hederaAccountId, setHederaAccountId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const profileCheckedRef = useRef<string | null>(null);
  const closeConverter = useCallback(() => setConverterOpen(false), []);

  // Always set the Privy embedded wallet as active for wagmi
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  useEffect(() => {
    if (embeddedWallet && address && embeddedWallet.address.toLowerCase() !== address.toLowerCase()) {
      setActiveWallet(embeddedWallet);
    }
  }, [embeddedWallet, address, setActiveWallet]);

  // Fetch Hedera Account ID from mirror node
  const activeAddress = embeddedWallet?.address ?? address;
  useEffect(() => {
    if (!activeAddress) return;
    setHederaAccountId(null);
    fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${activeAddress}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.account) setHederaAccountId(data.account);
      })
      .catch(() => {});
  }, [activeAddress]);

  // Reset association state when address changes
  useEffect(() => {
    setNeedsAssociation(false);
  }, [activeAddress]);

  // Check if user needs to complete profile after login
  useEffect(() => {
    if (!authenticated || !activeAddress) {
      setNeedsProfile(false);
      setNeedsAssociation(false);
      profileCheckedRef.current = null;
      return;
    }
    if (profileCheckedRef.current === activeAddress.toLowerCase()) return;

    fetch(`/api/profile?address=${activeAddress}`)
      .then((r) => r.json())
      .then((data) => {
        profileCheckedRef.current = activeAddress.toLowerCase();
        if (data === null) {
          setNeedsProfile(true);
        } else {
          setNeedsProfile(false);
          setNeedsAssociation(true);
        }
      })
      .catch(() => setNeedsProfile(true));
  }, [authenticated, activeAddress]);

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
    const truncated = `${(activeAddress ?? address).slice(0, 6)}...${(activeAddress ?? address).slice(-4)}`;
    const bal = balance
      ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(2)} ${balance.symbol}`
      : "";

    const label = user?.google?.email ?? user?.email?.address ?? truncated;

    return (
      <>
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
                <div className="truncate">{activeAddress ?? address}</div>
                {hederaAccountId && (
                  <div className="text-zinc-400 mt-0.5">{hederaAccountId}</div>
                )}
              </div>
              {embeddedWallet && (
                <>
                  <button
                    onClick={() => {
                      exportWallet();
                      setOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Export Private Key
                  </button>
                  <button
                    onClick={() => {
                      setConverterOpen(true);
                      setOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Convert Key to Hedera Format
                  </button>
                </>
              )}
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
        <KeyConverterModal open={converterOpen} onClose={closeConverter} />
        <ProfileModal
          open={needsProfile}
          address={activeAddress ?? address}
          onComplete={() => {
            setNeedsProfile(false);
            if (activeAddress) profileCheckedRef.current = activeAddress.toLowerCase();
            setNeedsAssociation(true);
          }}
        />
        <TokenAssociationModal
          open={needsAssociation && !needsProfile}
          address={(activeAddress ?? address) as `0x${string}`}
          onComplete={() => setNeedsAssociation(false)}
        />
      </>
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
