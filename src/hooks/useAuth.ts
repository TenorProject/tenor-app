"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function useAuth() {
  const { ready, authenticated } = usePrivy();
  const { address, isConnected } = useAccount();

  return {
    address,
    isConnected: ready && authenticated && isConnected && !!address,
  };
}
