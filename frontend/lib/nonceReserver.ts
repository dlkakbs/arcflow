import Redis from 'ioredis'

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
  if (!_redis) _redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
  return _redis
}

export function setRedisClient(client: Redis) {
  _redis = client
}

// On-chain nonce okur — test'te mock edilir
export async function getOnChainNonce(
  clientAddress: string,
  readContract: (addr: string) => Promise<number>
): Promise<number> {
  return readContract(clientAddress)
}

// Atomic nonce rezervasyonu
export async function reserveNonce(
  clientAddress: string,
  readContract: (addr: string) => Promise<number>
): Promise<{ nonce: number; reservationId: string }> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()

  // INCR atomik — iki eş zamanlı istek asla aynı değeri almaz
  const pendingOffset = await redis.incr(`pending:${addr}`)
  const onChainNonce = await readContract(addr)

  const nonce = onChainNonce + pendingOffset - 1
  const reservationId = crypto.randomUUID()

  const reservation: Reservation = {
    addr,
    nonce,
    state: 'reserved',
    createdAt: Date.now(),
    usedAt: null,
  }

  await redis.setex(
    `reservation:${reservationId}`,
    RESERVATION_TTL,
    JSON.stringify(reservation)
  )

  return { nonce, reservationId }
}

// Reservation'ı "submitted" olarak işaretle — SET XX ile race condition önlenir
export async function markSubmitted(reservationId: string): Promise<Reservation | null> {
  const redis = getRedis()
  const key = `reservation:${reservationId}`

  const raw = await redis.get(key)
  if (!raw) return null // expired veya yok

  const reservation: Reservation = JSON.parse(raw)

  if (reservation.state !== 'reserved') return null // zaten kullanılmış

  const updated: Reservation = { ...reservation, state: 'submitted', usedAt: Date.now() }

  // SET XX: sadece key varsa yaz — TTL'yi korur
  const ok = await redis.set(key, JSON.stringify(updated), 'KEEPTTL', 'XX')
  if (!ok) return null // başka istek yarıştı

  return updated
}

// Bir adrese ait submitted queue item'larını nonce sırasıyla getir
export async function getQueueItems(
  clientAddress: string,
  minNonce = 0,
  maxNonce = Infinity
): Promise<Array<{ nonce: number; deadline: number; signature: string }>> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()

  const max = maxNonce === Infinity ? '+inf' : String(maxNonce)
  const raw = await redis.zrangebyscore(`queue:${addr}`, minNonce, max)

  return raw.map(item => JSON.parse(item))
}

// Queue'ya ekle (zadd — score = nonce)
export async function enqueueItem(
  clientAddress: string,
  nonce: number,
  deadline: number,
  signature: string
): Promise<void> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()
  await redis.zadd(`queue:${addr}`, nonce, JSON.stringify({ nonce, deadline, signature }))
}

// Settle edilen nonce'ları queue'dan temizle
export async function removeSettled(clientAddress: string, upToNonce: number): Promise<void> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()
  await redis.zremrangebyscore(`queue:${addr}`, 0, upToNonce)
}

// pending counter'ı on-chain ile senkronize et (settle sonrası)
export async function syncPendingCounter(clientAddress: string): Promise<void> {
  const redis = getRedis()
  await redis.del(`pending:${clientAddress.toLowerCase()}`)
}
