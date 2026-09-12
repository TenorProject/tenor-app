"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/config";
import { hederaTestnet } from "@/config/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#FFFFFF",
        },
        loginMethods: ["google", "email", "wallet"],
        defaultChain: hederaTestnet,
        supportedChains: [hederaTestnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider
          config={wagmiConfig}
          setActiveWalletForWagmi={({ wallets }) =>
            wallets.find((w) => w.walletClientType === "privy") ?? wallets[0]
          }
        >
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
