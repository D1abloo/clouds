import { isDangerousCommand } from './command-validator'

describe('CommandValidator', () => {
  it('should detect rm -rf / as dangerous', () => {
    expect(isDangerousCommand('rm -rf /')).toBe(true)
  })

  it('should allow safe commands', () => {
    expect(isDangerousCommand('ls -la')).toBe(false)
    expect(isDangerousCommand('docker ps')).toBe(false)
  })

  it('should detect shutdown as dangerous', () => {
    expect(isDangerousCommand('sudo shutdown -h now')).toBe(true)
  })
})
