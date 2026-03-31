import RedisMock from 'ioredis-mock'
import { setRedisClient } from '../lib/nonceReserver'

// Her test için temiz Redis instance
export function createTestRedis() {
  const redis = new RedisMock()
  setRedisClient(redis)
  return redis
}

export async function resetRedis(redis: InstanceType<typeof RedisMock>) {
  await redis.flushall()
}

// On-chain nonce mock: address → nonce map
export function makeReadContract(nonceMap: Record<string, number> = {}) {
  return async (addr: string): Promise<number> => {
    return nonceMap[addr.toLowerCase()] ?? 0
  }
}

// writeContract mock: sadece tx hash döner, nonces kaydeder
export function makeWriteContract(settled: number[][] = []) {
  return async (args: {
    clients: string[]
    nonces: bigint[]
    deadlines: bigint[]
    signatures: string[]
  }): Promise<string> => {
    settled.push(args.nonces.map(Number))
    return `0xfaketxhash_${Date.now()}`
  }
}

// Gelecekte geçerli deadline (10 dakika)
export function futureDeadline(): number {
  return Math.floor(Date.now() / 1000) + 600
}

// Geçmiş deadline (expired)
export function pastDeadline(): number {
  return Math.floor(Date.now() / 1000) - 1
}
