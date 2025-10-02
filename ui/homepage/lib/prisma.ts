import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined
}

export function getPrismaClient() {
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return globalThis.prismaGlobal
}

const prisma = getPrismaClient()
export default prisma
