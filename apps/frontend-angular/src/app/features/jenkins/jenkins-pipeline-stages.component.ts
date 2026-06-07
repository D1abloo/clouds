import { Component, Input } from '@angular/core'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import type { JenkinsStage } from './jenkins.models'

@Component({
  selector: 'app-jenkins-pipeline-stages',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div class="pipeline-rail" role="list" aria-label="Etapas del pipeline">
      @for (stage of stages; track stage.name; let i = $index; let last = $last) {
        <div class="pipeline-rail__stage" role="listitem">
          <div class="pipeline-rail__node" [class]="stageClass(stage.status)">
            <span class="pipeline-rail__index">{{ i + 1 }}</span>
          </div>
          <div class="pipeline-rail__meta">
            <span class="pipeline-rail__name">{{ stage.name }}</span>
            @if (stage.duration) {
              <span class="pipeline-rail__duration">{{ stage.duration }}</span>
            }
            <app-status-badge [value]="stage.status" />
          </div>
        </div>
        @if (!last) {
          <div class="pipeline-rail__connector" [class]="connectorClass(stage.status)"></div>
        }
      }
    </div>
  `,
  styles: `
    .pipeline-rail {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.25rem 0;
      padding: 0.5rem 0;
    }
    .pipeline-rail__stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 100px;
      max-width: 140px;
    }
    .pipeline-rail__node {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      border: 2px solid var(--jenkins-stage-pending, #94a3b8);
      background: var(--app-card);
    }
    .pipeline-rail__node--success {
      border-color: var(--status-running, #22c55e);
      background: color-mix(in srgb, #22c55e 18%, transparent);
      color: #15803d;
    }
    .pipeline-rail__node--running {
      border-color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent) 20%, transparent);
      animation: jenkins-pulse 1.4s ease-in-out infinite;
    }
    .pipeline-rail__node--failure {
      border-color: var(--status-error);
      background: color-mix(in srgb, var(--status-error) 18%, transparent);
    }
    .pipeline-rail__node--unstable {
      border-color: var(--status-warning);
      background: color-mix(in srgb, var(--status-warning) 18%, transparent);
    }
    .pipeline-rail__meta {
      margin-top: 0.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      align-items: center;
    }
    .pipeline-rail__name {
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1.2;
    }
    .pipeline-rail__duration {
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .pipeline-rail__connector {
      width: 32px;
      height: 3px;
      margin-top: 18px;
      border-radius: 2px;
      background: #cbd5e1;
    }
    .pipeline-rail__connector--success { background: #22c55e; }
    .pipeline-rail__connector--running { background: var(--app-accent); }
    @keyframes jenkins-pulse {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--app-accent) 40%, transparent); }
      50% { box-shadow: 0 0 0 6px transparent; }
    }
  `,
})
export class JenkinsPipelineStagesComponent {
  @Input({ required: true }) stages: JenkinsStage[] = []

  stageClass = (status: string): string => {
    const s = status.toUpperCase()
    if (s === 'SUCCESS') return 'pipeline-rail__node pipeline-rail__node--success'
    if (s === 'RUNNING') return 'pipeline-rail__node pipeline-rail__node--running'
    if (s === 'FAILURE' || s === 'FAILED') return 'pipeline-rail__node pipeline-rail__node--failure'
    if (s === 'UNSTABLE') return 'pipeline-rail__node pipeline-rail__node--unstable'
    return 'pipeline-rail__node'
  }

  connectorClass = (status: string): string => {
    const s = status.toUpperCase()
    if (s === 'SUCCESS') return 'pipeline-rail__connector pipeline-rail__connector--success'
    if (s === 'RUNNING') return 'pipeline-rail__connector pipeline-rail__connector--running'
    return 'pipeline-rail__connector'
  }
}
