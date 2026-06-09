import { findDemoVpsServerIds } from './lib/clear-demo-vps-data'

describe('clear-demo-vps-data', () => {
  it('findDemoVpsServerIds exportado para plan dry-run', () => {
    expect(typeof findDemoVpsServerIds).toBe('function')
  })
})
