import { Redis } from '@upstash/redis'

// Arc Testnet — USDC native, 6 decimal
export const ARC_CHAIN_ID = 5042002
export const PAYWALL_ADDRESS = '0xb1f95F4d86C743cbe1797C931A9680dF5766633A' as `0x${string}`
export const RESERVATION_TTL = 300 // 5 dakika

export type SlotState = 'reserved' | 'submitted' | 'settled' | 'expired'

export interface Reservation {
  addr: string
  nonce: number
  state: SlotState
  createdAt: number
  usedAt: number | null
}

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

// Test'te inject için
export function setRedisClient(client: Redis) {
  _redis = client
}

// Atomic nonce rezervasyonu
export async function reserveNonce(
  clientAddress: string,
  readContract: (addr: string) => Promise<number>
): Promise<{ nonce: number; reservationId: string }> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()

  const pendingOffset = await redis.incr(`pending:${addr}`)
  const onChainNonce = await readContract(addr)

  const nonce = onChainNonce + (pendingOffset as number) - 1
  const reservationId = crypto.randomUUID()

  const reservation: Reservation = {
    addr,
    nonce,
    state: 'reserved',
    createdAt: Date.now(),
    usedAt: null,
  }

  await redis.set(`reservation:${reservationId}`, JSON.stringify(reservation), { ex: RESERVATION_TTL })

  return { nonce, reservationId }
}

// Reservation'ı "submitted" olarak işaretle
export async function markSubmitted(reservationId: string): Promise<Reservation | null> {
  const redis = getRedis()
  const key = `reservation:${reservationId}`

  const raw = await redis.get<string>(key)
  if (!raw) return null

  const reservation: Reservation = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (reservation.state !== 'reserved') return null

  const updated: Reservation = { ...reservation, state: 'submitted', usedAt: Date.now() }

  // XX: sadece key varsa yaz, keepttl: TTL'yi koru
  const ok = await redis.set(key, JSON.stringify(updated), { xx: true, keepTtl: true })
  if (!ok) return null

  return updated
}

// Queue'ya ekle (score = nonce, sıralı)
export async function enqueueItem(
  clientAddress: string,
  nonce: number,
  deadline: number,
  signature: string
): Promise<void> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()
  await redis.zadd(`queue:${addr}`, { score: nonce, member: JSON.stringify({ nonce, deadline, signature }) })
}

// Nonce sırasına göre queue item'larını getir
export async function getQueueItems(
  clientAddress: string,
  minNonce = 0,
  maxNonce = Infinity
): Promise<Array<{ nonce: number; deadline: number; signature: string }>> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()

  const max: number | '+inf' = maxNonce === Infinity ? '+inf' : maxNonce
  const raw = await redis.zrange(`queue:${addr}`, minNonce, max, { byScore: true })

  return (raw as string[]).map(item => (typeof item === 'string' ? JSON.parse(item) : item))
}

// Settle edilen item'ları sil
export async function removeSettled(clientAddress: string, upToNonce: number): Promise<void> {
  const redis = getRedis()
  await redis.zremrangebyscore(`queue:${clientAddress.toLowerCase()}`, 0, upToNonce)
}

// pending counter'ı sıfırla (settle sonrası)
export async function syncPendingCounter(clientAddress: string): Promise<void> {
  const redis = getRedis()
  await redis.del(`pending:${clientAddress.toLowerCase()}`)
}
