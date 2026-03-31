import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
});

const PAYWALL_ADDRESS = "0xb1f95F4d86C743cbe1797C931A9680dF5766633A" as `0x${string}`;

const ABI = [
  {
    name: "requestsRemaining",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "client", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function POST(req: Request) {
  const { address } = await req.json();

  if (!address) {
    return Response.json({ error: "Wallet address required." }, { status: 400 });
  }

  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(),
  });

  const remaining = await client.readContract({
    address: PAYWALL_ADDRESS,
    abi: ABI,
    functionName: "requestsRemaining",
    args: [address as `0x${string}`],
  });

  if (remaining === 0n) {
    return Response.json(
      { error: "No credits remaining. Deposit USDC to continue." },
      { status: 402 }
    );
  }

  return Response.json({
    success: true,
    response: {
      message: "Access granted.",
      model: "arcflow-demo-v1",
      timestamp: new Date().toISOString(),
    },
    creditsUsed: 1,
    creditsRemaining: (remaining - 1n).toString(),
  });
}
