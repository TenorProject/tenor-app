import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { hederaTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [hederaTestnet],
  transports: {
    [hederaTestnet.id]: http(),
  },
  ssr: true,
});
