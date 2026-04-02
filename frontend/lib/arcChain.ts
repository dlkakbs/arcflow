import { createPublicClient, http, defineChain } from 'viem'
import { ARC_NATIVE_USDC_DECIMALS } from './nativeUsdc'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: ARC_NATIVE_USDC_DECIMALS },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
})

export const PAYWALL_ADDRESS = '0xb1f95F4d86C743cbe1797C931A9680dF5766633A' as `0x${string}`

export const PAYWALL_ABI = [
  {
    name: 'nextNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'client', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'pricePerRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'requestsRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'client', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'redeemBatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'clients',      type: 'address[]' },
      { name: 'clientNonces', type: 'uint256[]' },
      { name: 'deadlines',    type: 'uint256[]' },
      { name: 'signatures',   type: 'bytes[]'   },
    ],
    outputs: [],
  },
] as const

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
})
