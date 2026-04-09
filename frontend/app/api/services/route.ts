import { NextRequest, NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import { listServices, registerService } from '@/lib/serviceRegistry'

export async function GET() {
  const services = await listServices()

  return NextResponse.json({
    services: services.map(({ endpoint, ...service }) => service),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { ownerAddress, name, desc, price, endpoint, signature, message } = await req.json()

    if (!ownerAddress || !name || !price || !endpoint || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const recovered = await recoverMessageAddress({
      message,
      signature,
    })

    if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid wallet signature.' }, { status: 401 })
    }

    const service = await registerService({
      ownerAddress,
      name,
      desc,
      price,
      endpoint,
    })

    const { endpoint: _endpoint, ...safeService } = service
    return NextResponse.json({ service: safeService })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
