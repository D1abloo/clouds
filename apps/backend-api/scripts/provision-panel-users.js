#!/usr/bin/env node
/**
 * Crea o actualiza usuarios del panel con roles RBAC y membresía de organización.
 *
 * Uso:
 *   node provision-panel-users.js --admin [--email admin@spendlyx.com] [--password 1234567890]
 *   node provision-panel-users.js --presets [--password-prefix 1000000000]
 *   node provision-panel-users.js --user ops@spendlyx.com --name "Operador" --role operador [--password ...]
 *   node provision-panel-users.js --list
 */
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const VALID_ROLES = new Set([
  'superadministrador',
  'administrador',
  'operador',
  'auditor',
  'solo_lectura',
  'super_admin',
])

const ROLE_ALIASES = {
  super_admin: 'superadministrador',
  admin: 'administrador',
  operator: 'operador',
  viewer: 'solo_lectura',
  read_only: 'solo_lectura',
}

const PRESET_USERS = [
  {
    key: 'admin',
    email: 'admin@spendlyx.com',
    name: 'Administrador Spendlyx',
    role: 'superadministrador',
    membership: 'OWNER',
  },
  {
    key: 'administrador',
    email: 'gestion@spendlyx.com',
    name: 'Gestor Administrador',
    role: 'administrador',
    membership: 'ADMIN',
  },
  {
    key: 'operador',
    email: 'operador@spendlyx.com',
    name: 'Operador Infraestructura',
    role: 'operador',
    membership: 'MEMBER',
  },
  {
    key: 'auditor',
    email: 'auditor@spendlyx.com',
    name: 'Auditor Cumplimiento',
    role: 'auditor',
    membership: 'MEMBER',
  },
  {
    key: 'solo_lectura',
    email: 'lectura@spendlyx.com',
    name: 'Usuario Solo Lectura',
    role: 'solo_lectura',
    membership: 'MEMBER',
  },
]

const parseArgs = (argv) => {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        args[key] = true
      } else {
        args[key] = next
        i++
      }
    } else {
      args._.push(token)
    }
  }
  return args
}

const randomNumericPassword = (length = 10) => {
  let out = ''
  while (out.length < length) {
    out += crypto.randomInt(0, 10).toString()
  }
  if (out[0] === '0') {
    out = `${crypto.randomInt(1, 10)}${out.slice(1)}`
  }
  return out.slice(0, length)
}

const ROBUST_CHARS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digit: '23456789',
  symbol: '!@#$%&*-_+=?',
}

const randomRobustPassword = (length = 20) => {
  const buckets = [
    ROBUST_CHARS.lower,
    ROBUST_CHARS.upper,
    ROBUST_CHARS.digit,
    ROBUST_CHARS.symbol,
  ]
  const chars = []
  for (const bucket of buckets) {
    chars.push(bucket[crypto.randomInt(0, bucket.length)])
  }
  const all = buckets.join('')
  while (chars.length < length) {
    chars.push(all[crypto.randomInt(0, all.length)])
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

const isRobustPassword = (password) => {
  const value = String(password ?? '')
  if (value.length < 16) return false
  if (!/[a-z]/.test(value)) return false
  if (!/[A-Z]/.test(value)) return false
  if (!/[0-9]/.test(value)) return false
  if (!/[^A-Za-z0-9]/.test(value)) return false
  return true
}

const normalizeRole = (role) => {
  const raw = String(role ?? '').trim().toLowerCase()
  const mapped = ROLE_ALIASES[raw] ?? raw
  if (!VALID_ROLES.has(mapped)) {
    throw new Error(
      `Rol inválido "${role}". Válidos: superadministrador, administrador, operador, auditor, solo_lectura`,
    )
  }
  return mapped === 'super_admin' ? 'superadministrador' : mapped
}

const membershipForRole = (role, explicit) => {
  if (explicit) return explicit
  if (role === 'superadministrador') return 'OWNER'
  if (role === 'administrador') return 'ADMIN'
  return 'MEMBER'
}

const ensureOrganizationContext = async () => {
  const organization = await prisma.organization.upsert({
    where: { slug: 'spendlyx' },
    create: { name: 'Spendlyx', slug: 'spendlyx' },
    update: { name: 'Spendlyx' },
  })

  let project = await prisma.project.findUnique({ where: { slug: 'default' } })
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Spendlyx',
        slug: 'default',
        description: 'Espacio de trabajo principal',
        organizationId: organization.id,
      },
    })
  } else if (project.organizationId !== organization.id) {
    project = await prisma.project.update({
      where: { id: project.id },
      data: { organizationId: organization.id, name: 'Spendlyx' },
    })
  }

  return { organization, project }
}

const resolveRole = async (roleName) => {
  const normalized = normalizeRole(roleName)
  let role = await prisma.role.findUnique({ where: { name: normalized } })
  if (!role && normalized === 'superadministrador') {
    role = await prisma.role.findUnique({ where: { name: 'super_admin' } })
  }
  if (!role) {
    throw new Error(`Rol "${normalized}" no existe en BD. Ejecuta prisma db seed primero.`)
  }
  return role
}

const upsertPanelUser = async ({
  email,
  name,
  role,
  password,
  membership,
  organization,
  project,
  verifyEmail = false,
}) => {
  const normalizedRole = normalizeRole(role)
  const roleRow = await resolveRole(normalizedRole)
  const passwordHash = await bcrypt.hash(password, 12)
  const verifiedAt = verifyEmail ? new Date() : undefined

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name,
      isActive: true,
      ...(verifiedAt ? { emailVerifiedAt: verifiedAt } : {}),
    },
    update: {
      passwordHash,
      name,
      isActive: true,
      deletedAt: null,
      ...(verifiedAt ? { emailVerifiedAt: verifiedAt } : {}),
    },
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId_projectId: {
        userId: user.id,
        roleId: roleRow.id,
        projectId: project.id,
      },
    },
    create: {
      userId: user.id,
      roleId: roleRow.id,
      projectId: project.id,
    },
    update: {},
  })

  const membershipRole = membershipForRole(normalizedRole, membership)
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: membershipRole,
    },
    update: { role: membershipRole },
  })

  return { user, role: normalizedRole, membership: membershipRole }
}

const printUserLine = ({ email, name, role, password, membership }) => {
  console.log(
    JSON.stringify(
      {
        email,
        name,
        role,
        membership,
        password,
      },
      null,
      2,
    ),
  )
}

const listUsers = async () => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { email: 'asc' },
    include: {
      userRoles: { include: { role: true, project: true } },
      memberships: { include: { organization: true } },
    },
  })

  for (const user of users) {
    const roles = [...new Set(user.userRoles.map((ur) => ur.role.name))]
    const memberships = user.memberships.map(
      (m) => `${m.organization.slug}:${m.role}`,
    )
    console.log(`${user.email}\t${user.name ?? '—'}\troles=${roles.join(',')}\torg=${memberships.join(',')}`)
  }
}

const run = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.list) {
    await listUsers()
    return
  }

  const ctx = await ensureOrganizationContext()

  if (args.admin) {
    const email = String(args.email ?? 'admin@spendlyx.com').trim().toLowerCase()
    const name = String(args.name ?? 'Administrador Spendlyx').trim()
    const password = String(args.password ?? randomRobustPassword(20))
    if (!isRobustPassword(password)) {
      throw new Error(
        'La contraseña admin debe tener ≥16 caracteres con mayúsculas, minúsculas, números y símbolos',
      )
    }

    const result = await upsertPanelUser({
      email,
      name,
      role: 'superadministrador',
      password,
      membership: 'OWNER',
      organization: ctx.organization,
      project: ctx.project,
      verifyEmail: true,
    })

    console.log('==> Administrador PRO creado/actualizado (acceso total)')
    printUserLine({
      email: result.user.email,
      name: result.user.name,
      role: result.role,
      membership: result.membership,
      password,
    })
    return
  }

  if (args.presets) {
    const results = []
    for (const preset of PRESET_USERS) {
      const password =
        args['password-prefix'] != null
          ? String(Number(args['password-prefix']) + PRESET_USERS.indexOf(preset)).padStart(10, '0')
          : randomNumericPassword(10)

      const result = await upsertPanelUser({
        email: preset.email,
        name: preset.name,
        role: preset.role,
        password,
        membership: preset.membership,
        organization: ctx.organization,
        project: ctx.project,
      })

      results.push({
        key: preset.key,
        email: result.user.email,
        name: result.user.name,
        role: result.role,
        membership: result.membership,
        password,
      })
    }

    console.log('==> Usuarios preset creados/actualizados')
    console.log(JSON.stringify(results, null, 2))
    return
  }

  if (args.user) {
    const email = String(args.user).trim().toLowerCase()
    const name = String(args.name ?? email.split('@')[0]).trim()
    const role = args.role
    if (!role) throw new Error('Indica --role')
    const password = String(args.password ?? randomNumericPassword(10))
    if (!/^\d{10}$/.test(password)) {
      throw new Error('La contraseña debe ser numérica de 10 dígitos')
    }

    const result = await upsertPanelUser({
      email,
      name,
      role,
      password,
      membership: args.membership,
      organization: ctx.organization,
      project: ctx.project,
    })

    console.log('==> Usuario creado/actualizado')
    printUserLine({
      email: result.user.email,
      name: result.user.name,
      role: result.role,
      membership: result.membership,
      password,
    })
    return
  }

  console.log(`Uso:
  node provision-panel-users.js --admin [--email admin@spendlyx.com] [--password 'Robusta!2026Segura']
  node provision-panel-users.js --presets
  node provision-panel-users.js --user email@dominio.com --name "Nombre" --role operador [--password 1234567890]
  node provision-panel-users.js --list`)
}

run()
  .catch((error) => {
    console.error(error.message ?? error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
