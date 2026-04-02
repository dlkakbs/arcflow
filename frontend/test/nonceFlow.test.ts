import { describe, it, expect, beforeEach } from 'vitest'
import {
  reserveNonce,
  markSubmitted,
  enqueueItem,
  getQueueItems,
} from '../lib/nonceReserver'
import { settleBatch } from '../lib/batchSettler'
import {
  createTestRedis,
  resetRedis,
  makeReadContract,
  makeWriteContract,
  futureDeadline,
  pastDeadline,
} from './helpers'

const CLIENT = '0xabcd1234abcd1234abcd1234abcd1234abcd1234'
const PRICE = BigInt(1e15) // 0.001 native USDC (18 decimals)

let redis: ReturnType<typeof createTestRedis>

beforeEach(async () => {
  redis = createTestRedis()
  await resetRedis(redis)
})

// ─── Senaryo 1: Aynı anda 2 nonce isteği ─────────────────────────────────
describe('Senaryo 1: Concurrent nonce requests', () => {
  it('iki eş zamanlı isteğe farklı nonce atamalı', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })

    const [a, b] = await Promise.all([
      reserveNonce(CLIENT, readContract),
      reserveNonce(CLIENT, readContract),
    ])

    expect(a.nonce).not.toBe(b.nonce)
    expect(Math.abs(a.nonce - b.nonce)).toBe(1)
  })

  it('her rezervasyon farklı reservationId almalı', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })

    const [a, b] = await Promise.all([
      reserveNonce(CLIENT, readContract),
      reserveNonce(CLIENT, readContract),
    ])

    expect(a.reservationId).not.toBe(b.reservationId)
  })

  it('10 eş zamanlı istek → 10 farklı nonce, ardışık', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })

    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveNonce(CLIENT, readContract))
    )

    const nonces = results.map(r => r.nonce).sort((a, b) => a - b)
    const unique = new Set(nonces)

    expect(unique.size).toBe(10)
    expect(nonces[0]).toBe(0)
    expect(nonces[9]).toBe(9)
  })
})

// ─── Senaryo 2: Aynı request 2 kez gelirse ───────────────────────────────
describe('Senaryo 2: Duplicate request (idempotency)', () => {
  it('aynı reservationId ikinci kez kullanılırsa null dönmeli', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })
    const { reservationId } = await reserveNonce(CLIENT, readContract)

    const first = await markSubmitted(reservationId)
    const second = await markSubmitted(reservationId) // tekrar

    expect(first).not.toBeNull()
    expect(first?.state).toBe('submitted')
    expect(second).toBeNull() // reddedildi
  })

  it('farklı reservationId ile gelen istek kabul edilmeli', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })

    const r1 = await reserveNonce(CLIENT, readContract)
    const r2 = await reserveNonce(CLIENT, readContract)

    const s1 = await markSubmitted(r1.reservationId)
    const s2 = await markSubmitted(r2.reservationId)

    expect(s1?.state).toBe('submitted')
    expect(s2?.state).toBe('submitted')
  })
})

// ─── Senaryo 3: TTL sonrası geç gelen imza ───────────────────────────────
describe('Senaryo 3: Late signature after reservation timeout', () => {
  it('TTL dolan (silinmiş) reservation null dönmeli', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })
    const { reservationId } = await reserveNonce(CLIENT, readContract)

    // TTL expire simülasyonu — key'i manuel sil
    await redis.del(`reservation:${reservationId}`)

    const result = await markSubmitted(reservationId)
    expect(result).toBeNull()
  })

  it('expired nonce reallocate edilmemeli — gap kabul edilir', async () => {
    const readContract = makeReadContract({ [CLIENT]: 0 })

    // Nonce 0 rezerve et, expire et
    const { nonce: n0, reservationId: r0 } = await reserveNonce(CLIENT, readContract)
    expect(n0).toBe(0)
    await redis.del(`reservation:${r0}`)

    // Yeni istek → nonce 1 almalı (0 tekrar verilmez, gap oluşur)
    const { nonce: n1 } = await reserveNonce(CLIENT, readContract)
    expect(n1).toBe(1) // 0 değil
  })

  it('süresi geçmiş deadline ile settle batch item skip etmeli', async () => {
    const settled: number[][] = []
    const write = makeWriteContract(settled)

    await enqueueItem(CLIENT, 0, pastDeadline(), '0xsig')

    const result = await settleBatch(CLIENT, 0, PRICE, write)

    expect(result.nonces).toHaveLength(0)
    expect(result.skipped).toContain(0)
    expect(settled).toHaveLength(0) // writeContract hiç çağrılmadı
  })
})

// ─── Senaryo 4: Out-of-order batch settlement ─────────────────────────────
describe('Senaryo 4: Out-of-order batch settlement', () => {
  it('out-of-order submit → settle nonce sırasına göre yapılmalı', async () => {
    const settled: number[][] = []
    const write = makeWriteContract(settled)
    const deadline = futureDeadline()

    // 3,1,2 sırasında enqueue
    await enqueueItem(CLIENT, 2, deadline, '0xsig2')
    await enqueueItem(CLIENT, 0, deadline, '0xsig0')
    await enqueueItem(CLIENT, 1, deadline, '0xsig1')

    const result = await settleBatch(CLIENT, 0, PRICE, write)

    // nonce sırasıyla settle edilmeli
    expect(result.nonces).toEqual([0, 1, 2])
    expect(settled[0]).toEqual([0, 1, 2])
  })

  it('on-chain nonce 2 ise sadece 2 settle edilmeli, 0 ve 1 fetch bile edilmemeli', async () => {
    const settled: number[][] = []
    const write = makeWriteContract(settled)
    const deadline = futureDeadline()

    // Stale item'lar queue'da kalmış (crash nedeniyle silinmemiş)
    await enqueueItem(CLIENT, 0, deadline, '0xsig0')
    await enqueueItem(CLIENT, 1, deadline, '0xsig1')
    // Pending item
    await enqueueItem(CLIENT, 2, deadline, '0xsig2')

    // On-chain nonce = 2 → getQueueItems range başlangıcı 2, 0 ve 1 fetch edilmez
    const result = await settleBatch(CLIENT, 2, PRICE, write)

    expect(result.nonces).toEqual([2])
    expect(settled[0]).toEqual([2]) // writeContract'a sadece nonce 2 gitti
    // 0 ve 1 range dışında → skipped listesine girmez, range filtresi yeterli
    expect(result.skipped).toHaveLength(0)
  })
})

// ─── Senaryo 5: Settler crash — yarım kalan queue ────────────────────────
describe('Senaryo 5: Settler crash recovery', () => {
  it('crash sonrası restart → on-chain nonce başlangıç noktası, queue devam eder', async () => {
    const deadline = futureDeadline()

    // Crash simülasyonu: 0,1 on-chain settle edildi ama queue'dan silinmedi
    // Settler restart: queue'da 0-4 var, on-chain nonce = 2
    for (let i = 0; i < 5; i++) {
      await enqueueItem(CLIENT, i, deadline, `0xsig${i}`)
    }

    // Restart: on-chain nonce = 2 ile devam → sadece 2,3,4 fetch edilir
    const settled: number[][] = []
    const result = await settleBatch(CLIENT, 2, PRICE, makeWriteContract(settled))

    expect(result.nonces).toEqual([2, 3, 4])
    expect(settled[0]).toEqual([2, 3, 4])
    // 0 ve 1 range dışında → atlanır, güvenli
  })

  it('boş queue ile settler çalışırsa writeContract çağrılmamalı', async () => {
    const settled: number[][] = []
    const write = makeWriteContract(settled)

    const result = await settleBatch(CLIENT, 0, PRICE, write)

    expect(result.nonces).toHaveLength(0)
    expect(settled).toHaveLength(0)
  })

  it('tüm item expired olursa writeContract çağrılmamalı', async () => {
    const settled: number[][] = []
    const write = makeWriteContract(settled)

    await enqueueItem(CLIENT, 0, pastDeadline(), '0xsig0')
    await enqueueItem(CLIENT, 1, pastDeadline(), '0xsig1')

    const result = await settleBatch(CLIENT, 0, PRICE, write)

    expect(result.nonces).toHaveLength(0)
    expect(result.skipped).toEqual([0, 1])
    expect(settled).toHaveLength(0)
  })
})
