import {
  getQueueItems,
  removeSettled,
  syncPendingCounter,
  PAYWALL_ADDRESS,
  ARC_CHAIN_ID,
} from './nonceReserver'
import { keccak256, encodePacked, toBytes } from 'viem'

export const BATCH_SIZE = 50
export const BATCH_INTERVAL_MS = 10 * 60 * 1000 // 10 dakika

export interface BatchResult {
  nonces: number[]
  skipped: number[]
  txHash?: string
}

// İmza doğrulama (contract'taki hash ile aynı)
export function buildMsgHash(
  clientAddress: string,
  nonce: number,
  deadline: number,
  pricePerRequest: bigint
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [
        PAYWALL_ADDRESS,
        BigInt(ARC_CHAIN_ID),
        clientAddress as `0x${string}`,
        BigInt(nonce),
        BigInt(deadline),
        pricePerRequest,
      ]
    )
  )
}

// Batch settle — writeContract inject edilerek test edilebilir
export async function settleBatch(
  clientAddress: string,
  onChainNonce: number,
  pricePerRequest: bigint,
  writeContract: (args: {
    clients: string[]
    nonces: bigint[]
    deadlines: bigint[]
    signatures: string[]
  }) => Promise<string>
): Promise<BatchResult> {
  const now = Math.floor(Date.now() / 1000)

  const items = await getQueueItems(clientAddress, onChainNonce, onChainNonce + BATCH_SIZE - 1)

  const valid: typeof items = []
  const skipped: number[] = []

  for (const item of items) {
    // Süresi geçmiş → skip
    if (item.deadline <= now) {
      skipped.push(item.nonce)
      continue
    }
    // On-chain nonce'dan küçük → zaten settled → skip
    if (item.nonce < onChainNonce) {
      skipped.push(item.nonce)
      continue
    }
    valid.push(item)
  }

  if (valid.length === 0) return { nonces: [], skipped }

  const txHash = await writeContract({
    clients: valid.map(() => clientAddress),
    nonces: valid.map(i => BigInt(i.nonce)),
    deadlines: valid.map(i => BigInt(i.deadline)),
    signatures: valid.map(i => i.signature),
  })

  const settledNonces = valid.map(i => i.nonce)
  const maxNonce = Math.max(...settledNonces)

  await removeSettled(clientAddress, maxNonce)
  await syncPendingCounter(clientAddress)

  return { nonces: settledNonces, skipped, txHash }
}
