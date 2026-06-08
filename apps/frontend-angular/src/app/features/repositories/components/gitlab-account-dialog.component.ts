import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith } from 'rxjs'
import {
  GITLAB_PROJECT_SCOPES,
  GITLAB_SCOPES,
  previewGitlabProjectSync,
  type GitlabAccountFormResult,
} from '../utils/gitlab-account-form.config'

@Component({
  selector: 'app-gitlab-account-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="gl-acc-dialog">
      <header class="gl-acc-dialog__head">
        <div>
          <h2 mat-dialog-title>Añadir cuenta GitLab</h2>
          <p class="gl-acc-dialog__sub">
            PAT con scopes api y read_repository · sync de proyectos según grupo y permisos
          </p>
        </div>
        <span class="gl-acc-dialog__chip">GitLab CI · ~2 min</span>
      </header>

      <mat-dialog-content>
        <div class="gl-acc-dialog__layout">
          <div class="gl-acc-dialog__form">
            <section class="gl-acc-section">
              <h3><mat-icon>badge</mat-icon> Cuenta</h3>
              <div class="gl-acc-grid gl-acc-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Etiqueta</mat-label>
                  <input matInput [formControl]="label" placeholder="GitLab producción" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tipo</mat-label>
                  <mat-select [formControl]="accountType">
                    <mat-option value="personal">Personal</mat-option>
                    <mat-option value="group">Grupo / org</mat-option>
                    <mat-option value="self-hosted">Self-hosted</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="gl-acc-grid gl-acc-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Usuario GitLab</mat-label>
                  <input matInput [formControl]="username" placeholder="cloudops-gitlab" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>URL instancia</mat-label>
                  <input matInput [formControl]="hostUrl" placeholder="https://gitlab.com" />
                </mat-form-field>
              </div>
              @if (showGroup()) {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Grupo / namespace</mat-label>
                  <input matInput [formControl]="groupPath" placeholder="cloudops-platform" />
                  <mat-hint>Path del grupo para filtrar proyectos en sync</mat-hint>
                </mat-form-field>
              }
            </section>

            <section class="gl-acc-section">
              <h3><mat-icon>key</mat-icon> Token</h3>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Personal Access Token</mat-label>
                <input matInput [formControl]="token" type="password" autocomplete="off" placeholder="glpat-…" />
                @if (token.invalid && token.touched) {
                  <mat-error>Token obligatorio</mat-error>
                }
              </mat-form-field>
            </section>

            <section class="gl-acc-section">
              <h3><mat-icon>shield</mat-icon> Scopes</h3>
              <div class="gl-acc-scopes">
                @for (scope of visibleScopes(); track scope.id) {
                  <label class="gl-acc-scope">
                    <mat-checkbox
                      [checked]="isScopeChecked(scope.id)"
                      [disabled]="scope.required"
                      (change)="handleScopeToggle(scope.id, $event.checked)"
                    />
                    <span><code>{{ scope.label }}</code><small>{{ scope.description }}</small></span>
                  </label>
                }
              </div>
            </section>

            <section class="gl-acc-section">
              <h3><mat-icon>sync</mat-icon> Sincronización de proyectos</h3>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Alcance</mat-label>
                <mat-select [formControl]="projectScope">
                  @for (p of projectScopes; track p.value) {
                    <mat-option [value]="p.value">{{ p.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="gl-acc-checks">
                <mat-checkbox [formControl]="syncOnConnect">Sincronizar proyectos al conectar (según permisos)</mat-checkbox>
                <mat-checkbox [formControl]="autoSync">Sync automática periódica</mat-checkbox>
                <mat-checkbox [formControl]="validateBeforeSave">Validar token antes de guardar</mat-checkbox>
              </div>
            </section>
          </div>

          <aside class="gl-acc-dialog__aside">
            <article class="gl-acc-sync-preview" [class.gl-acc-sync-preview--warn]="!syncPreview().canSync || !syncPreview().accessible">
              <h4><mat-icon>folder</mat-icon> Proyectos importables</h4>
              <p><strong>{{ syncPreview().accessible }}</strong> / {{ syncPreview().total }} proyectos</p>
              @if (syncPreview().sampleProjects.length) {
                <ul>
                  @for (p of syncPreview().sampleProjects; track p) {
                    <li>{{ p }}</li>
                  }
                </ul>
              }
              @for (r of syncPreview().reasons; track r) {
                <p class="gl-acc-note">{{ r }}</p>
              }
            </article>
            <article class="gl-acc-steps">
              <h4>Al conectar</h4>
              <ol>
                @for (step of steps(); track step) { <li>{{ step }}</li> }
              </ol>
            </article>
          </aside>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button mat-flat-button class="gl-btn" type="button" [disabled]="!canSubmit()" (click)="handleSubmit()">
          Añadir cuenta
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .gl-acc-dialog__head { display: flex; justify-content: space-between; gap: 0.75rem; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.12rem; font-weight: 700; }
    .gl-acc-dialog__sub { margin: 0.15rem 0 0; font-size: 0.72rem; color: var(--app-text-muted); }
    .gl-acc-dialog__chip {
      font-size: 0.65rem; font-weight: 700; padding: 0.25rem 0.55rem; border-radius: 4px;
      color: #c2410c; background: color-mix(in srgb, #fc6d26 14%, transparent);
    }
    .gl-acc-dialog__layout { display: grid; grid-template-columns: 1fr 240px; gap: 1.25rem; }
    .gl-acc-section { padding: 0.65rem 0; border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.65rem; font-size: 0.82rem;
        mat-icon { color: #fc6d26; font-size: 1rem; width: 1rem; height: 1rem; } }
    }
    .gl-acc-grid { display: grid; gap: 0.35rem 0.75rem; }
    .gl-acc-grid--2 { grid-template-columns: 1fr 1fr; }
    .full { width: 100%; }
    .gl-acc-demo-banner { display: flex; gap: 0.5rem; padding: 0.55rem; margin-bottom: 0.5rem; font-size: 0.76rem;
      background: color-mix(in srgb, #fc6d26 8%, transparent); mat-icon { color: #fc6d26; } p { margin: 0; } }
    .gl-acc-scopes { display: flex; flex-direction: column; gap: 0.3rem; }
    .gl-acc-scope { display: flex; gap: 0.35rem; font-size: 0.76rem; code { font-weight: 700; } small { display: block; color: var(--app-text-muted); font-size: 0.68rem; } }
    .gl-acc-checks { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.78rem; }
    .gl-acc-dialog__aside { display: flex; flex-direction: column; gap: 0.75rem; position: sticky; top: 0; }
    .gl-acc-sync-preview, .gl-acc-steps {
      padding: 0.65rem 0.75rem; border-left: 2px solid color-mix(in srgb, #fc6d26 40%, transparent); font-size: 0.74rem;
      h4 { margin: 0 0 0.4rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); display: flex; align-items: center; gap: 0.25rem; }
      ul { margin: 0.35rem 0 0; padding-left: 0; list-style: none; font-size: 0.68rem; font-family: ui-monospace, monospace; }
      ol { margin: 0; padding-left: 1.1rem; }
    }
    .gl-acc-sync-preview--warn { border-left-color: #f59e0b; background: color-mix(in srgb, #f59e0b 6%, transparent); }
    .gl-acc-note { margin: 0.25rem 0 0; font-size: 0.68rem; color: var(--app-text-muted); font-style: italic; }
    .gl-btn { background: #fc6d26 !important; color: #fff !important; }
    @media (max-width: 780px) { .gl-acc-dialog__layout { grid-template-columns: 1fr; } .gl-acc-grid--2 { grid-template-columns: 1fr; } }
  `,
})
export class GitlabAccountDialogComponent {
  private readonly ref = inject(MatDialogRef<GitlabAccountDialogComponent, GitlabAccountFormResult>)

  readonly projectScopes = GITLAB_PROJECT_SCOPES

  readonly label = new FormControl('GitLab producción', { nonNullable: true, validators: [Validators.required] })
  readonly username = new FormControl('cloudops-gitlab', { nonNullable: true, validators: [Validators.required] })
  readonly hostUrl = new FormControl('https://gitlab.com', { nonNullable: true })
  readonly accountType = new FormControl<'personal' | 'group' | 'self-hosted'>('group', { nonNullable: true })
  readonly groupPath = new FormControl('cloudops-platform', { nonNullable: true })
  readonly token = new FormControl('', { nonNullable: true, validators: [Validators.required] })
  readonly projectScope = new FormControl<'all' | 'group' | 'selected'>('group', { nonNullable: true })
  readonly syncOnConnect = new FormControl(true, { nonNullable: true })
  readonly autoSync = new FormControl(true, { nonNullable: true })
  readonly validateBeforeSave = new FormControl(true, { nonNullable: true })

  readonly selectedScopes = signal<string[]>(GITLAB_SCOPES.filter((s) => s.required).map((s) => s.id))

  private readonly accountTypeSig = toSignal(this.accountType.valueChanges.pipe(startWith(this.accountType.value)), {
    initialValue: this.accountType.value,
  })
  private readonly projectScopeSig = toSignal(this.projectScope.valueChanges.pipe(startWith(this.projectScope.value)), {
    initialValue: this.projectScope.value,
  })
  private readonly groupSig = toSignal(this.groupPath.valueChanges.pipe(startWith(this.groupPath.value)), {
    initialValue: this.groupPath.value,
  })

  readonly showGroup = computed(() => this.accountTypeSig() === 'group' || this.projectScopeSig() === 'group')

  readonly visibleScopes = computed(() =>
    GITLAB_SCOPES.filter((s) => !('groupOnly' in s && s.groupOnly) || this.accountTypeSig() === 'group'),
  )

  readonly syncPreview = computed(() =>
    previewGitlabProjectSync({
      scopes: this.selectedScopes(),
      projectScope: this.projectScopeSig(),
      groupPath: this.groupSig(),
      accountType: this.accountTypeSig(),
    }),
  )

  readonly steps = computed(() => {
    const s = ['Guardar credenciales GitLab']
    if (this.validateBeforeSave.value) s.push('Validar PAT contra la API')
    if (this.syncOnConnect.value) {
      const p = this.syncPreview()
      s.push(`Importar ${p.accessible} proyecto(s) permitidos por scopes`)
    }
    return s
  })

  canSubmit = (): boolean =>
    this.label.valid &&
    this.username.valid &&
    !!this.token.value.trim()

  isScopeChecked = (id: string): boolean => this.selectedScopes().includes(id)

  handleScopeToggle = (id: string, checked: boolean): void => {
    const def = GITLAB_SCOPES.find((s) => s.id === id)
    if (def?.required) return
    this.selectedScopes.update((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  handleSubmit = (): void => {
    if (!this.canSubmit()) return
    this.ref.close({
      label: this.label.value.trim(),
      username: this.username.value.trim(),
      token: this.token.value.trim(),
      hostUrl: this.hostUrl.value.trim(),
      accountType: this.accountType.value,
      groupPath: this.showGroup() ? this.groupPath.value.trim() : undefined,
      scopes: this.selectedScopes(),
      projectScope: this.projectScope.value,
      autoSync: this.autoSync.value,
      syncOnConnect: this.syncOnConnect.value,
      validateBeforeSave: this.validateBeforeSave.value,
      useDemoData: false,
    })
  }
}
