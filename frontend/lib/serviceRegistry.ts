import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface ServiceRecord {
  serviceId: string
  ownerAddress: string
  name: string
  desc: string
  price: string
  endpoint: string
  proxyUrl: string
  createdAt: string
}

const REGISTRY_PATH = path.join('/tmp', 'arcflow-services.json')

async function ensureRegistryFile() {
  try {
    await fs.access(REGISTRY_PATH)
  } catch {
    await fs.writeFile(REGISTRY_PATH, '[]', 'utf8')
  }
}

async function readRegistry(): Promise<ServiceRecord[]> {
  await ensureRegistryFile()
  const raw = await fs.readFile(REGISTRY_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

async function writeRegistry(services: ServiceRecord[]) {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(services, null, 2), 'utf8')
}

export async function listServices(): Promise<ServiceRecord[]> {
  return readRegistry()
}

export async function getService(serviceId: string): Promise<ServiceRecord | null> {
  const services = await readRegistry()
  return services.find((service) => service.serviceId === serviceId) ?? null
}

export async function registerService(input: {
  ownerAddress: string
  name: string
  desc?: string
  price: string
  endpoint: string
}): Promise<ServiceRecord> {
  const services = await readRegistry()
  const serviceId = `svc_${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const service: ServiceRecord = {
    serviceId,
    ownerAddress: input.ownerAddress,
    name: input.name,
    desc: input.desc ?? '',
    price: input.price,
    endpoint: input.endpoint,
    proxyUrl: `/api/proxy?service=${serviceId}`,
    createdAt: new Date().toISOString(),
  }

  services.push(service)
  await writeRegistry(services)
  return service
}
