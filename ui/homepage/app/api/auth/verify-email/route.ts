import { NextRequest, NextResponse } from 'next/server'

import prisma from '@lib/prisma'
import { hashValue } from '@lib/auth/crypto'
import { normalizeEmail } from '@lib/auth/validation'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    code?: string
  }

  const email = normalizeEmail(String(body?.email ?? ''))
  const code = String(body?.code ?? '').trim()

  if (!email || !code) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, status: true } })
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  }

  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!verification) {
    return NextResponse.json({ error: 'code_not_found' }, { status: 404 })
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'code_expired' }, { status: 410 })
  }

  const expectedHash = hashValue(`${code}:${email}`)
  if (verification.codeHash !== expectedHash) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailVerification.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    })

    await tx.user.update({
      where: { id: user.id },
      data: { status: 'active' },
    })
  })

  return NextResponse.json({ success: true })
}

export function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed' },
    {
      status: 405,
      headers: { Allow: 'POST' },
    },
  )
}
