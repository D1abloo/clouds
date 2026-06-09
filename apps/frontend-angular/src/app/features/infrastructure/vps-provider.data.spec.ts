import { buildVpsSnapshot } from '../../features/infrastructure/vps-provider.data'

describe('buildVpsSnapshot PRO', () => {
  it('devuelve snapshot vacío sin cuentas ni servidores demo', () => {
    for (const slug of ['digitalocean', 'hetzner', 'linode', 'ovh'] as const) {
      const snap = buildVpsSnapshot(slug)
      expect(snap.accounts).toBe(0)
      expect(snap.servers).toBe(0)
      expect(snap.accountRows).toEqual([])
      expect(snap.serverRows).toEqual([])
      expect(snap.lastSync).toBe('—')
    }
  })
})
