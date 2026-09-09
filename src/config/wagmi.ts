import { http, createConfig } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { hederaTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [hederaTestnet],
  connectors: [injected(), metaMask()],
  transports: {
    [hederaTestnet.id]: http(),
  },
  ssr: true,
});
