import { vi } from 'vitest'

// ioredis'i mock ile değiştir
vi.mock('ioredis', () => {
  const RedisMock = require('ioredis-mock')
  return { default: RedisMock }
})
