import { type NextRequest, NextResponse } from 'next/server'
import { keccak256, encodePacked, recoverMessageAddress } from 'viem'
import { markSubmitted, enqueueItem, getRedis } from '@/lib/nonceReserver'
import { settleBatch, BATCH_SIZE } from '@/lib/batchSettler'
import { publicClient, PAYWALL_ADDRESS, PAYWALL_ABI, arcTestnet } from '@/lib/arcChain'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const DEMO_RESPONSES: Record<string, string> = {
  default: 'ArcFlow enables usage-based payments onchain.',
  stream:  'Streaming payments on ArcFlow accrue every second. Recipients can withdraw anytime.',
  invoice: 'ArcFlow invoices are settled on-chain. Create one, share the ID, and the payer sends USDC directly.',
  paywall: 'The paywall model lets you deposit USDC upfront and consume credits per API call — no subscription.',
  usdc:    'ArcFlow uses native USDC on Arc Testnet. Sub-cent transactions make micropayments viable.',
  arc:     'Arc is a high-throughput EVM chain with native USDC. ArcFlow is built natively on Arc.',
  how:     'ArcFlow has three primitives: Stream (continuous), Invoice (one-time), Paywall (per-request).',
}

function getDemoResponse(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('stream') || lower.includes('salary'))   return DEMO_RESPONSES.stream
  if (lower.includes('invoice') || lower.includes('bill'))    return DEMO_RESPONSES.invoice
  if (lower.includes('paywall') || lower.includes('credit'))  return DEMO_RESPONSES.paywall
  if (lower.includes('usdc') || lower.includes('token'))      return DEMO_RESPONSES.usdc
  if (lower.includes('arc') || lower.includes('chain'))       return DEMO_RESPONSES.arc
  if (lower.includes('how') || lower.includes('what'))        return DEMO_RESPONSES.how
  return DEMO_RESPONSES.default
}

export async function POST(req: NextRequest) {
  try {
  const { reservationId, idempotencyKey, signature, prompt, clientAddress } = await req.json()

  if (!reservationId || !idempotencyKey || !signature || !clientAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const redis = getRedis()

  // ── Idempotency: aynı key ile gelen tekrar istek → cache'den dön ──────
  const cached = await redis.get(`idem:${idempotencyKey}`)
  if (cached) return NextResponse.json(JSON.parse(cached))

  // ── Reservation yükle ve "submitted" olarak işaretle ─────────────────
  const reservation = await markSubmitted(reservationId)
  if (!reservation) {
    return NextResponse.json(
      { error: 'Reservation expired or already used.' },
      { status: 400 }
    )
  }

  // ── Deadline kontrolü ─────────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000)
  const deadline = Math.floor(reservation.createdAt / 1000) + 600 // get-nonce ile aynı deadline

  if (now > deadline) {
    return NextResponse.json({ error: 'Signature deadline expired.' }, { status: 400 })
  }

  // ── On-chain pricePerRequest ──────────────────────────────────────────
  const pricePerRequest = await publicClient.readContract({
    address: PAYWALL_ADDRESS,
    abi: PAYWALL_ABI,
    functionName: 'pricePerRequest',
  })

  // ── İmzayı doğrula (contract ile aynı hash) ───────────────────────────
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
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  // ── Queue'ya ekle ─────────────────────────────────────────────────────
  await enqueueItem(clientAddress, reservation.nonce, deadline, signature)

  // ── Batch threshold kontrolü → settle ─────────────────────────────────
  const queueSize = await redis.zcard(`queue:${clientAddress.toLowerCase()}`)
  if (queueSize >= BATCH_SIZE && process.env.OWNER_PRIVATE_KEY) {
    triggerBatchSettle(clientAddress, pricePerRequest).catch(console.error)
  }

  // ── Response ──────────────────────────────────────────────────────────
  const remaining = await publicClient.readContract({
    address: PAYWALL_ADDRESS,
    abi: PAYWALL_ABI,
    functionName: 'requestsRemaining',
    args: [clientAddress as `0x${string}`],
  })

  const result = {
    success: true,
    response: {
      message:   getDemoResponse(prompt ?? ''),
      model:     'arcflow-demo-v1',
      timestamp: new Date().toISOString(),
    },
    creditsUsed:      1,
    creditsRemaining: (remaining - 1n).toString(),
  }

  // Idempotency cache — 1 saat
  await redis.setex(`idem:${idempotencyKey}`, 3600, JSON.stringify(result))

  return NextResponse.json(result)
  } catch (err) {
    console.error('[request]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// Fire-and-forget batch settle — owner private key env'den
async function triggerBatchSettle(clientAddress: string, pricePerRequest: bigint) {
  const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`)
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(),
  })

  const onChainNonce = await publicClient.readContract({
    address: PAYWALL_ADDRESS,
    abi: PAYWALL_ABI,
    functionName: 'nextNonce',
    args: [clientAddress as `0x${string}`],
  })

  await settleBatch(
    clientAddress,
    Number(onChainNonce),
    pricePerRequest,
    async ({ clients, nonces, deadlines, signatures }) => {
      const hash = await walletClient.writeContract({
        address: PAYWALL_ADDRESS,
        abi: PAYWALL_ABI,
        functionName: 'redeemBatch',
        args: [clients as `0x${string}`[], nonces, deadlines, signatures as `0x${string}`[]],
      })
      return hash
    }
  )
}
