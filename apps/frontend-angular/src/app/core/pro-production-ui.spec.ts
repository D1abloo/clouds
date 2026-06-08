import { TestBed } from '@angular/core/testing'
import { environment } from '../../environments/environment'

describe('PRO production UI — sin referencias demo visibles', () => {
  it('environment.production desactiva demoMode', () => {
    expect(environment.production).toBe(true)
    expect(environment.demoMode).toBe(false)
    expect(environment.proMode).toBe(true)
  })
})
