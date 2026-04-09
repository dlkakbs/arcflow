import { keccak256, encodePacked, recoverMessageAddress } from 'viem'
import { markSubmitted, getRedis, getQueueSize } from './nonceReserver'
import { publicClient, PAYWALL_ADDRESS, PAYWALL_ABI, arcTestnet } from './arcChain'

export const SIGNATURE_WINDOW_SECONDS = 24 * 60 * 60

export interface VerifiedPaymentRequest {
  reservation: {
    addr: string
    nonce: number
    createdAt: number
  }
  pricePerRequest: bigint
  deadline: number
}

export function getSignatureDeadline(createdAtMs: number): number {
  return Math.floor(createdAtMs / 1000) + SIGNATURE_WINDOW_SECONDS
}

export async function getOnChainNonce(clientAddress: string): Promise<number> {
  const nextNonce = await publicClient.readContract({
    address: PAYWALL_ADDRESS,
    abi: PAYWALL_ABI,
    functionName: 'nextNonce',
    args: [clientAddress as `0x${string}`],
  })

  return Number(nextNonce)
}

export async function getCreditsSnapshot(clientAddress: string) {
  const [remaining, queueSize] = await Promise.all([
    publicClient.readContract({
      address: PAYWALL_ADDRESS,
      abi: PAYWALL_ABI,
      functionName: 'requestsRemaining',
      args: [clientAddress as `0x${string}`],
    }),
    getQueueSize(clientAddress),
  ])

  const pending = BigInt(queueSize)
  const available = remaining > pending ? remaining - pending : 0n

  return { onChainRemaining: remaining, pendingQueued: queueSize, availableCredits: available }
}

export async function verifyPaidRequest({
  reservationId,
  signature,
  clientAddress,
}: {
  reservationId: string
  signature: string
  clientAddress: string
}): Promise<VerifiedPaymentRequest> {
  const reservation = await markSubmitted(reservationId)
  if (!reservation) {
    throw new Error('Reservation expired or already used.')
  }

  const deadline = getSignatureDeadline(reservation.createdAt)
  const now = Math.floor(Date.now() / 1000)
  if (now > deadline) {
    throw new Error('Signature deadline expired.')
  }

  const pricePerRequest = await publicClient.readContract({
    address: PAYWALL_ADDRESS,
    abi: PAYWALL_ABI,
    functionName: 'pricePerRequest',
  })

  const msgHash = keccak256(
    encodePacked(
      ['address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [
        PAYWALL_ADDRESS,
        BigInt(arcTestnet.id),
        clientAddress as `0x${string}`,
        BigInt(reservation.nonce),
        BigInt(deadline),
        pricePerRequest,
      ]
    )
  )

  const recovered = await recoverMessageAddress({
    message: { raw: msgHash },
    signature: signature as `0x${string}`,
  })

  if (recovered.toLowerCase() !== clientAddress.toLowerCase()) {
    throw new Error('Invalid signature.')
  }

  return {
    reservation: {
      addr: reservation.addr,
      nonce: reservation.nonce,
      createdAt: reservation.createdAt,
    },
    pricePerRequest,
    deadline,
  }
}

export async function readCachedResponse(idempotencyKey: string) {
  const redis = getRedis()
  const cached = await redis.get<string>(`idem:${idempotencyKey}`)
  if (!cached) return null
  return typeof cached === 'string' ? JSON.parse(cached) : cached
}

export async function cacheResponse(idempotencyKey: string, result: unknown) {
  const redis = getRedis()
  await redis.setex(`idem:${idempotencyKey}`, 3600, JSON.stringify(result))
}
