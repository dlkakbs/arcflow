import { type NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getActiveClients, removeActiveClient } from '@/lib/nonceReserver'
import { settleBatch } from '@/lib/batchSettler'
import { IS_PAYWALL_V2, PAYWALL_ADDRESS, PAYWALL_V1_ABI, PAYWALL_V2_ABI, arcTestnet } from '@/lib/arcChain'
import { getOnChainNonce } from '@/lib/paywallPayment'

// Vercel Cron: bu endpoint'i sadece Vercel çağırabilir
function isAuthorized(req: NextRequest): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OWNER_PRIVATE_KEY) {
    return NextResponse.json({ error: 'OWNER_PRIVATE_KEY not set' }, { status: 500 })
  }

  const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`)
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() })

  const clients = await getActiveClients()

  const results: Record<string, { settled: number; skipped: number }> = {}

  for (const clientAddress of clients) {
    try {
      const result = await settleBatch(
        clientAddress,
        await getOnChainNonce(clientAddress),
        0n,
        async ({ serviceIds, clients: c, nonces, deadlines, signatures }) => {
          const hash = await walletClient.writeContract({
            address: PAYWALL_ADDRESS,
            abi: IS_PAYWALL_V2 ? PAYWALL_V2_ABI : PAYWALL_V1_ABI,
            functionName: 'redeemBatch',
            args: IS_PAYWALL_V2
              ? [serviceIds as `0x${string}`[], c as `0x${string}`[], nonces, deadlines, signatures as `0x${string}`[]]
              : [c as `0x${string}`[], nonces, deadlines, signatures as `0x${string}`[]],
          })
          return hash
        },
        getOnChainNonce
      )

      results[clientAddress] = {
        settled: result.nonces.length,
        skipped: result.skipped.length,
      }

      // Queue boşaldıysa active listesinden çıkar
      if (result.nonces.length === 0 && result.skipped.length === 0) {
        await removeActiveClient(clientAddress)
      }
    } catch (err) {
      console.error(`[settle] ${clientAddress}:`, err)
      results[clientAddress] = { settled: -1, skipped: -1 }
    }
  }

  return NextResponse.json({ clients: clients.length, results })
}
