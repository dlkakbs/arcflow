import { Redis } from '@upstash/redis'

// Arc Testnet — native USDC uses 18 decimals
export const ARC_CHAIN_ID = 5042002
export const RESERVATION_TTL = 300 // 5 dakika

export type SlotState = 'reserved' | 'submitted' | 'settled' | 'expired'

export interface Reservation {
  addr: string
  nonce: number
  serviceId?: string
  state: SlotState
  createdAt: number
  usedAt: number | null
}

type ZItem = { score: number; member: string }

interface RedisLike {
  incr(key: string): Promise<number>
  set(key: string, value: string, opts?: { ex?: number; xx?: boolean; keepTtl?: boolean }): Promise<unknown>
  setex(key: string, seconds: number, value: string): Promise<unknown>
  get<T = string>(key: string): Promise<T | null>
  del(key: string): Promise<number>
  zadd(key: string, item: ZItem): Promise<number>
  zcard(key: string): Promise<number>
  sadd(key: string, member: string): Promise<number>
  smembers(key: string): Promise<string[]>
  srem(key: string, member: string): Promise<number>
  zrange(key: string, min: number, max: number | '+inf', opts?: { byScore?: boolean }): Promise<string[]>
  zremrangebyscore(key: string, min: number, max: number): Promise<number>
}

class LocalRedis implements RedisLike {
  private values = new Map<string, string>()
  private expiries = new Map<string, number>()
  private sets = new Map<string, Set<string>>()
  private zsets = new Map<string, ZItem[]>()

  private purge(key: string) {
    const expiry = this.expiries.get(key)
    if (expiry && Date.now() > expiry) {
      this.values.delete(key)
      this.expiries.delete(key)
    }
  }

  async incr(key: string) {
    this.purge(key)
    const current = Number(this.values.get(key) ?? '0') + 1
    this.values.set(key, String(current))
    return current
  }

  async set(key: string, value: string, opts?: { ex?: number; xx?: boolean; keepTtl?: boolean }) {
    this.purge(key)
    if (opts?.xx && !this.values.has(key)) return null
    this.values.set(key, value)
    if (opts?.ex) this.expiries.set(key, Date.now() + opts.ex * 1000)
    if (!opts?.keepTtl && !opts?.ex) this.expiries.delete(key)
    return 'OK'
  }

  async setex(key: string, seconds: number, value: string) {
    this.values.set(key, value)
    this.expiries.set(key, Date.now() + seconds * 1000)
    return 'OK'
  }

  async get<T = string>(key: string) {
    this.purge(key)
    return (this.values.get(key) as T | undefined) ?? null
  }

  async del(key: string) {
    const existed = this.values.delete(key)
    this.expiries.delete(key)
    this.sets.delete(key)
    this.zsets.delete(key)
    return existed ? 1 : 0
  }

  async zadd(key: string, item: ZItem) {
    const items = this.zsets.get(key) ?? []
    items.push(item)
    items.sort((a, b) => a.score - b.score)
    this.zsets.set(key, items)
    return 1
  }

  async zcard(key: string) {
    return (this.zsets.get(key) ?? []).length
  }

  async sadd(key: string, member: string) {
    const set = this.sets.get(key) ?? new Set<string>()
    const before = set.size
    set.add(member)
    this.sets.set(key, set)
    return set.size > before ? 1 : 0
  }

  async smembers(key: string) {
    return [...(this.sets.get(key) ?? new Set<string>())]
  }

  async srem(key: string, member: string) {
    const set = this.sets.get(key)
    if (!set) return 0
    const existed = set.delete(member)
    return existed ? 1 : 0
  }

  async zrange(key: string, min: number, max: number | '+inf', opts?: { byScore?: boolean }) {
    const items = this.zsets.get(key) ?? []
    if (opts?.byScore) {
      const maxScore = max === '+inf' ? Number.POSITIVE_INFINITY : max
      return items.filter((item) => item.score >= min && item.score <= maxScore).map((item) => item.member)
    }
    return items.slice(min, max === '+inf' ? undefined : max + 1).map((item) => item.member)
  }

  async zremrangebyscore(key: string, min: number, max: number) {
    const items = this.zsets.get(key) ?? []
    const filtered = items.filter((item) => item.score < min || item.score > max)
    this.zsets.set(key, filtered)
    return items.length - filtered.length
  }
}

let _redis: (RedisLike | Redis) | null = null

export function getRedis(): RedisLike | Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    _redis = url && token
      ? (new Redis({ url, token }) as unknown as RedisLike)
      : new LocalRedis()
  }
  return _redis
}

// Test'te inject için
export function setRedisClient(client: RedisLike | Redis) {
  _redis = client
}

// Atomic nonce rezervasyonu
export async function reserveNonce(
  clientAddress: string,
  readContract: (addr: string) => Promise<number>,
  serviceId?: string
): Promise<{ nonce: number; reservationId: string }> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()

  const pendingOffset = await redis.incr(`pending:${addr}`)
  const onChainNonce = await readContract(addr)

  const nonce = onChainNonce + pendingOffset - 1
  const reservationId = crypto.randomUUID()

  const reservation: Reservation = {
    addr,
    nonce,
    serviceId,
    state: 'reserved',
    createdAt: Date.now(),
    usedAt: null,
  }

  await redis.set(`reservation:${reservationId}`, JSON.stringify(reservation), { ex: RESERVATION_TTL })

  return { nonce, reservationId }
}

export async function markSubmitted(reservationId: string): Promise<Reservation | null> {
  const redis = getRedis()
  const key = `reservation:${reservationId}`

  const raw = await redis.get<string>(key)
  if (!raw) return null

  const reservation: Reservation = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (reservation.state !== 'reserved') return null

  const updated: Reservation = { ...reservation, state: 'submitted', usedAt: Date.now() }
  const ok = await redis.set(key, JSON.stringify(updated), { xx: true, keepTtl: true })
  if (!ok) return null

  return updated
}

export async function enqueueItem(
  clientAddress: string,
  nonce: number,
  deadline: number,
  signature: string,
  serviceId?: string
): Promise<void> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()
  await redis.zadd(`queue:${addr}`, { score: nonce, member: JSON.stringify({ nonce, deadline, signature, serviceId }) })
  await redis.sadd('active-clients', addr)
}

export async function getQueueSize(clientAddress: string): Promise<number> {
  const redis = getRedis()
  return Number(await redis.zcard(`queue:${clientAddress.toLowerCase()}`))
}

export async function getActiveClients(): Promise<string[]> {
  const redis = getRedis()
  return await redis.smembers('active-clients')
}

export async function removeActiveClient(clientAddress: string): Promise<void> {
  const redis = getRedis()
  await redis.srem('active-clients', clientAddress.toLowerCase())
}

export async function getQueueItems(
  clientAddress: string,
  minNonce = 0,
  maxNonce = Infinity
): Promise<Array<{ nonce: number; deadline: number; signature: string; serviceId?: string }>> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()
  const max: number | '+inf' = maxNonce === Infinity ? '+inf' : maxNonce
  const raw = await redis.zrange(`queue:${addr}`, minNonce, max, { byScore: true })
  return raw.map((item) => (typeof item === 'string' ? JSON.parse(item) : item))
}

export async function removeSettled(clientAddress: string, upToNonce: number): Promise<void> {
  const redis = getRedis()
  await redis.zremrangebyscore(`queue:${clientAddress.toLowerCase()}`, 0, upToNonce)
}

export async function syncPendingCounter(clientAddress: string): Promise<void> {
  const redis = getRedis()
  const addr = clientAddress.toLowerCase()
  const size = Number(await redis.zcard(`queue:${addr}`))

  if (size === 0) {
    await redis.del(`pending:${addr}`)
    await removeActiveClient(addr)
    return
  }

  await redis.set(`pending:${addr}`, String(size))
}
