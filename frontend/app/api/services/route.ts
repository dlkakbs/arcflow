import { NextRequest, NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import { IS_PAYWALL_V2, PAYWALL_ADDRESS, PAYWALL_V2_ABI, publicClient } from '@/lib/arcChain'
import { listServices, registerService } from '@/lib/serviceRegistry'

export async function GET() {
  const services = await listServices()
  const enriched = await Promise.all(
    services.map(async (service) => {
      if (IS_PAYWALL_V2 && /^0x[0-9a-fA-F]{64}$/.test(service.serviceId)) {
        try {
          const onChain = await publicClient.readContract({
            address: PAYWALL_ADDRESS,
            abi: PAYWALL_V2_ABI,
            functionName: 'getService',
            args: [service.serviceId as `0x${string}`],
          })

          return {
            serviceId: service.serviceId,
            ownerAddress: onChain.owner,
            name: service.name,
            desc: service.desc,
            price: onChain.pricePerRequest.toString(),
            active: onChain.active,
            proxyUrl: service.proxyUrl,
            createdAt: service.createdAt,
          }
        } catch {
          return null
        }
      }

      return {
        serviceId: service.serviceId,
        ownerAddress: service.ownerAddress,
        name: service.name,
        desc: service.desc,
        proxyUrl: service.proxyUrl,
        createdAt: service.createdAt,
      }
    })
  )

  return NextResponse.json({
    services: enriched.filter(Boolean),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { ownerAddress, name, desc, endpoint, signature, message, serviceId } = await req.json()

    if (!ownerAddress || !name || !endpoint || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const recovered = await recoverMessageAddress({
      message,
      signature,
    })

    if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid wallet signature.' }, { status: 401 })
    }

    if (IS_PAYWALL_V2) {
      if (!serviceId || !/^0x[0-9a-fA-F]{64}$/.test(serviceId)) {
        return NextResponse.json({ error: 'Missing onchain service id.' }, { status: 400 })
      }

      const onChain = await publicClient.readContract({
        address: PAYWALL_ADDRESS,
        abi: PAYWALL_V2_ABI,
        functionName: 'getService',
        args: [serviceId as `0x${string}`],
      })

      if (onChain.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Wallet is not the onchain service owner.' }, { status: 403 })
      }
    }

    const service = await registerService({
      serviceId,
      ownerAddress,
      name,
      desc,
      endpoint,
    })

    if (IS_PAYWALL_V2 && serviceId) {
      const onChain = await publicClient.readContract({
        address: PAYWALL_ADDRESS,
        abi: PAYWALL_V2_ABI,
        functionName: 'getService',
        args: [serviceId as `0x${string}`],
      })

      return NextResponse.json({
        service: {
          serviceId: service.serviceId,
          ownerAddress: onChain.owner,
          name: service.name,
          desc: service.desc,
          price: onChain.pricePerRequest.toString(),
          active: onChain.active,
          proxyUrl: service.proxyUrl,
          createdAt: service.createdAt,
        },
      })
    }

    return NextResponse.json({
      service: {
        serviceId: service.serviceId,
        ownerAddress: service.ownerAddress,
        name: service.name,
        desc: service.desc,
        proxyUrl: service.proxyUrl,
        createdAt: service.createdAt,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
