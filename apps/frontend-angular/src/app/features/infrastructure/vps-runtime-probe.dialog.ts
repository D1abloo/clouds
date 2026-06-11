import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { Router } from '@angular/router'
import { VpsService, type VpsRuntimeProbeResult } from '../../core/services/vps.service'

export interface VpsRuntimeProbeDialogData {
  vpsId: string
  hostName: string
  hostIp: string
}

export type VpsRuntimeProbeDialogResult =
  | { action: 'navigate'; route: string; label: string }
  | { action: 'close' }

@Component({
  selector: 'app-vps-runtime-probe-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="vps-runtime-dialog">
      <header class="vps-runtime-dialog__head">
        <mat-icon>hub</mat-icon>
        <div>
          <h2 mat-dialog-title>¿Tiene Docker o Kubernetes en este servidor?</h2>
          <p class="vps-runtime-dialog__sub mono">{{ data.hostName }} · {{ data.hostIp }}</p>
        </div>
      </header>

      <mat-dialog-content>
        @if (!probing() && !result()) {
          <p>
            Si el host ejecuta contenedores o un clúster Kubernetes, podemos verificarlo vía SSH y
            habilitar acceso directo a las secciones Docker o Kubernetes del panel.
          </p>
        }

        @if (probing()) {
          <div class="vps-runtime-dialog__loading" role="status" aria-live="polite">
            <mat-spinner diameter="28" />
            <span>Comprobando runtimes en el servidor…</span>
          </div>
        }

        @if (result(); as r) {
          @if (!r.docker && !r.kubernetes) {
            <p class="vps-runtime-dialog__empty">
              No se detectó Docker ni Kubernetes. Puedes activarlos más tarde desde el inventario.
            </p>
          } @else {
            <ul class="vps-runtime-dialog__hits">
              @if (r.docker) {
                <li><mat-icon>view_in_ar</mat-icon> Docker Engine detectado</li>
              }
              @if (r.kubernetes) {
                <li><mat-icon>account_tree</mat-icon> Kubernetes / kubelet detectado</li>
              }
            </ul>

            @if (r.containers.length) {
              <section class="vps-runtime-dialog__containers">
                <h3>Contenedores detectados</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Imagen</th>
                      <th>CPU</th>
                      <th>RAM</th>
                      <th>Disco</th>
                      <th>Red</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of r.containers; track c.name) {
                      <tr>
                        <td>{{ c.name }}</td>
                        <td class="mono">{{ c.image }}</td>
                        <td>{{ c.cpu }}%</td>
                        <td>{{ c.ram }} MB</td>
                        <td>{{ c.disk }} MB</td>
                        <td>{{ c.networkMbps }} Mbps</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            }

            @if (r.navigationHints.length) {
              <nav class="vps-runtime-dialog__nav" aria-label="Accesos rápidos">
                @for (hint of r.navigationHints; track hint.route) {
                  <button mat-stroked-button type="button" (click)="handleNavigate(hint.route, hint.label)">
                    <mat-icon>{{ hint.section === 'docker' ? 'view_in_ar' : 'account_tree' }}</mat-icon>
                    Ir a {{ hint.label }}
                  </button>
                }
              </nav>
            }
          }
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @if (!probing() && !result()) {
          <button mat-button type="button" (click)="handleSkip()">No, continuar</button>
          <button mat-flat-button color="primary" type="button" (click)="handleProbe()">
            Sí, verificar ahora
          </button>
        } @else {
          <button mat-flat-button color="primary" type="button" mat-dialog-close>Cerrar</button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-runtime-dialog__head {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
    }
    .vps-runtime-dialog__head mat-icon {
      color: var(--infra-accent-deep, #c2410c);
      margin-top: 0.15rem;
    }
    .vps-runtime-dialog__sub {
      margin: 0.2rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .vps-runtime-dialog__loading {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 0;
      font-size: 0.82rem;
      color: var(--app-text-muted);
    }
    .vps-runtime-dialog__empty {
      margin: 0;
      font-size: 0.82rem;
      color: var(--app-text-muted);
    }
    .vps-runtime-dialog__hits {
      list-style: none;
      margin: 0 0 0.75rem;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-runtime-dialog__hits li {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #047857;
    }
    .vps-runtime-dialog__hits mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .vps-runtime-dialog__containers h3 {
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-runtime-dialog__containers table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
    }
    .vps-runtime-dialog__containers th,
    .vps-runtime-dialog__containers td {
      padding: 0.35rem 0.4rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      text-align: left;
    }
    .vps-runtime-dialog__nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsRuntimeProbeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<VpsRuntimeProbeDialogComponent, VpsRuntimeProbeDialogResult | undefined>)
  private readonly vps = inject(VpsService)
  private readonly router = inject(Router)
  readonly data = inject<VpsRuntimeProbeDialogData>(MAT_DIALOG_DATA)

  readonly probing = signal(false)
  readonly result = signal<VpsRuntimeProbeResult | null>(null)

  handleSkip = (): void => {
    this.dialogRef.close({ action: 'close' })
  }

  handleProbe = (): void => {
    this.probing.set(true)
    this.vps.detectRuntime(this.data.vpsId, { probeDocker: true, probeKubernetes: true }).subscribe({
      next: (r) => {
        this.probing.set(false)
        this.result.set(r)
      },
      error: () => {
        this.probing.set(false)
        this.result.set({
          docker: false,
          kubernetes: false,
          containers: [],
          navigationHints: [],
          message: 'No se pudo completar la verificación',
        })
      },
    })
  }

  handleNavigate = (route: string, label: string): void => {
    this.dialogRef.close({ action: 'navigate', route, label })
    void this.router.navigateByUrl(route)
  }
}
