import { keccak256, encodePacked, recoverMessageAddress } from 'viem'
import { markSubmitted, getRedis, getQueueSize } from './nonceReserver'
import {
  arcTestnet,
  IS_PAYWALL_V2,
  PAYWALL_ADDRESS,
  PAYWALL_V1_ABI,
  PAYWALL_V2_ABI,
  publicClient,
} from './arcChain'

export const SIGNATURE_WINDOW_SECONDS = 24 * 60 * 60

export interface VerifiedPaymentRequest {
  reservation: {
    addr: string
    nonce: number
    serviceId?: string
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
    abi: IS_PAYWALL_V2 ? PAYWALL_V2_ABI : PAYWALL_V1_ABI,
    functionName: 'nextNonce',
    args: [clientAddress as `0x${string}`],
  })

  return Number(nextNonce)
}

export async function getCreditsSnapshot(clientAddress: string, serviceId?: string) {
  const [remaining, queueSize] = await Promise.all([
    IS_PAYWALL_V2 && serviceId
      ? publicClient.readContract({
          address: PAYWALL_ADDRESS,
          abi: PAYWALL_V2_ABI,
          functionName: 'requestsRemaining',
          args: [clientAddress as `0x${string}`, serviceId as `0x${string}`],
        })
      : publicClient.readContract({
          address: PAYWALL_ADDRESS,
          abi: PAYWALL_V1_ABI,
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
  serviceId,
}: {
  reservationId: string
  signature: string
  clientAddress: string
  serviceId?: string
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

  const targetServiceId = reservation.serviceId ?? serviceId
  const pricePerRequest =
    IS_PAYWALL_V2 && targetServiceId
      ? (await publicClient.readContract({
          address: PAYWALL_ADDRESS,
          abi: PAYWALL_V2_ABI,
          functionName: 'getService',
          args: [targetServiceId as `0x${string}`],
        })).pricePerRequest
      : await publicClient.readContract({
          address: PAYWALL_ADDRESS,
          abi: PAYWALL_V1_ABI,
          functionName: 'pricePerRequest',
        })

  const msgHash =
    IS_PAYWALL_V2 && targetServiceId
      ? keccak256(
          encodePacked(
            ['address', 'uint256', 'bytes32', 'address', 'uint256', 'uint256', 'uint256'],
            [
              PAYWALL_ADDRESS,
              BigInt(arcTestnet.id),
              targetServiceId as `0x${string}`,
              clientAddress as `0x${string}`,
              BigInt(reservation.nonce),
              BigInt(deadline),
              pricePerRequest,
            ]
          )
        )
      : keccak256(
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
      serviceId: targetServiceId,
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
