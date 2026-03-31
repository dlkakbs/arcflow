import { type NextRequest, NextResponse } from 'next/server'
import { publicClient, PAYWALL_ADDRESS, PAYWALL_ABI } from '@/lib/arcChain'
import { reserveNonce } from '@/lib/nonceReserver'

export async function POST(req: NextRequest) {
  try {
    const { clientAddress } = await req.json()

    if (!clientAddress || !/^0x[0-9a-fA-F]{40}$/.test(clientAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    // On-chain'den pricePerRequest oku
    const pricePerRequest = await publicClient.readContract({
      address: PAYWALL_ADDRESS,
      abi: PAYWALL_ABI,
      functionName: 'pricePerRequest',
    })

    // Remaining bakiyeyi kontrol et
    const remaining = await publicClient.readContract({
      address: PAYWALL_ADDRESS,
      abi: PAYWALL_ABI,
      functionName: 'requestsRemaining',
      args: [clientAddress as `0x${string}`],
    })

    if (remaining === 0n) {
      return NextResponse.json(
        { error: 'No credits remaining. Deposit USDC to continue.' },
        { status: 402 }
      )
    }

    // nextNonce — eski contract'ta yok, backend counter kullan (0'dan başla)
    const readContract = async (_addr: string): Promise<number> => 0

    const { nonce, reservationId } = await reserveNonce(clientAddress, readContract)

    const deadline = Math.floor(Date.now() / 1000) + 600

    return NextResponse.json({
      nonce,
      reservationId,
      deadline,
      pricePerRequest: pricePerRequest.toString(),
    })
  } catch (err) {
    console.error('[get-nonce]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
