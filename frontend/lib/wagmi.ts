import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { ARC_NATIVE_USDC_DECIMALS } from "./nativeUsdc";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: ARC_NATIVE_USDC_DECIMALS },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const CONTRACTS = {
  arcFlow:    "0xAB78614fED57bB451b70EE194fC4043CADCC39eF" as `0x${string}`,
  arcInvoice: "0x8d533a6DF78ef01F6E4E998588D3Ccb21F668486" as `0x${string}`,
  arcPaywall: ((process.env.NEXT_PUBLIC_ARC_PAYWALL_V2_ADDRESS as `0x${string}` | undefined) ??
    "0xb1f95F4d86C743cbe1797C931A9680dF5766633A") as `0x${string}`,
};

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
  },
});
