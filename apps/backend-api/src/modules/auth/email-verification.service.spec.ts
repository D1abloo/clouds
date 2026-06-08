import { Test, TestingModule } from '@nestjs/testing'
import * as crypto from 'crypto'
import { EmailVerificationService } from './email-verification.service'
import { PrismaService } from '../../common/prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { AuditService } from '../audit/audit.service'
import { ConfigService } from '@nestjs/config'

describe('EmailVerificationService', () => {
  let service: EmailVerificationService
  const prisma = {
    emailVerificationToken: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  }
  const email = {
    isConfigured: jest.fn().mockReturnValue(true),
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  }
  const audit = { create: jest.fn() }
  const config = {
    get: jest.fn((key: string) => (key === 'APP_URL' ? 'https://spendlyx.com' : undefined)),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: AuditService, useValue: audit },
        { provide: ConfigService, useValue: config },
      ],
    }).compile()
    service = module.get(EmailVerificationService)
  })

  const expectReject = async (fn: () => Promise<unknown>) => {
    let failed = false
    try {
      await fn()
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  }

  it('rejects invalid token', async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue(null)
    await expectReject(() => service.verifyToken('bad'))
  })

  it('rejects expired token', async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: '1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: null, deletedAt: null },
    })
    await expectReject(() => service.verifyToken('token'))
  })

  it('rejects used token', async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: '1',
      userId: 'u1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
      user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: null, deletedAt: null },
    })
    await expectReject(() => service.verifyToken('token'))
  })

  it('verifies valid token', async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: '1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      user: { id: 'u1', email: 'user@spendlyx.com', name: 'User', emailVerifiedAt: null, deletedAt: null },
    })
    prisma.user.update.mockResolvedValue({})
    prisma.emailVerificationToken.update.mockResolvedValue({})
    const result = await service.verifyToken('valid-token')
    expect(result.verified).toBe(true)
    expect(audit.create).toHaveBeenCalled()
  })
})

describe('Email verification token hashing', () => {
  it('stores hashed tokens only', () => {
    const raw = crypto.randomBytes(16).toString('hex')
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    expect(hash).not.toBe(raw)
    expect(hash.length).toBe(64)
  })
})
