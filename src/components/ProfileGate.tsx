"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ProfileModal } from "./ProfileModal";

export function ProfileGate() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [needsProfile, setNeedsProfile] = useState(false);
  const lastCheckedAddr = useRef<string | null>(null);

  // Get address from Privy wallets directly (doesn't depend on wagmi)
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const address = wallet?.address;

  useEffect(() => {
    if (!ready || !authenticated || !address) {
      setNeedsProfile(false);
      lastCheckedAddr.current = null;
      return;
    }

    if (lastCheckedAddr.current === address.toLowerCase()) return;

    fetch(`/api/profile?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        lastCheckedAddr.current = address.toLowerCase();
        setNeedsProfile(data === null);
      })
      .catch(() => {
        lastCheckedAddr.current = null;
        setNeedsProfile(true);
      });
  }, [ready, authenticated, address]);

  const handleComplete = useCallback(() => {
    setNeedsProfile(false);
    if (address) lastCheckedAddr.current = address.toLowerCase();
  }, [address]);

  if (!ready || !authenticated || !address || !needsProfile) return null;

  return (
    <ProfileModal
      open={needsProfile}
      address={address}
      onComplete={handleComplete}
    />
  );
}
