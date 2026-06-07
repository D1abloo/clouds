/** Workspace de ejecuciones — tema claro, alineado con Runbooks */
export const RUNBOOKS_EXECUTIONS_STYLES = `
  .rex {
    --rex-accent: #7c3aed;
    --rex-accent-soft: color-mix(in srgb, #7c3aed 10%, #fff);
    --rex-accent-mid: color-mix(in srgb, #7c3aed 18%, #fff);
    --rex-rail: #f8f7fc;
    --rex-rail-border: color-mix(in srgb, #7c3aed 12%, #e2e8f0);
    --rex-rail-text: #64748b;
    --rex-rail-text-strong: #1e293b;
    --rex-stage: #f1f5f9;
    --rex-surface: #ffffff;
    --rex-ink: #0f172a;
    --rex-muted: #64748b;
    --rex-ok: #059669;
    --rex-warn: #d97706;
    --rex-err: #dc2626;
    display: grid;
    grid-template-columns: minmax(240px, 268px) minmax(0, 1fr);
    gap: 0;
    flex: 1;
    height: 100%;
    min-height: calc(100dvh - 128px);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, #7c3aed 14%, #e2e8f0);
    box-shadow:
      0 1px 2px rgb(15 23 42 / 0.04),
      0 12px 40px -16px color-mix(in srgb, #7c3aed 18%, transparent);
    background: var(--rex-surface);
  }
  .rex-rail {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: linear-gradient(
      180deg,
      var(--rex-accent-soft) 0%,
      var(--rex-rail) 28%,
      #fafafa 100%
    );
    border-right: 1px solid var(--rex-rail-border);
  }
  .rex-rail__cal {
    flex-shrink: 0;
    max-height: 11.5rem;
    overflow: hidden;
    padding: 0.3rem 0.35rem 0;
    background: var(--rex-surface);
    margin: 0.4rem 0.4rem 0;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, #7c3aed 10%, #e2e8f0);
    box-shadow: 0 2px 8px rgb(15 23 42 / 0.04);
  }
  .rex-rail__cal app-runbook-executions-calendar {
    display: block;
    max-height: 10.5rem;
    overflow: hidden;
  }
  .rex-rail__list {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .rex-rail__list-head {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.65rem 0.75rem 0.5rem;
    flex-shrink: 0;
  }
  .rex-rail__list-head h4 {
    margin: 0;
    flex: 1;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--rex-rail-text-strong);
    text-transform: capitalize;
    line-height: 1.3;
  }
  .rex-rail__list-head p {
    margin: 0.12rem 0 0;
    font-size: 0.62rem;
    color: var(--rex-rail-text);
  }
  .rex-rail__count {
    min-width: 1.65rem;
    height: 1.65rem;
    padding: 0 0.35rem;
    display: grid;
    place-items: center;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    box-shadow: 0 2px 8px color-mix(in srgb, #7c3aed 28%, transparent);
  }
  .rex-timeline {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0.5rem 0.65rem;
    overflow-y: auto;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, #7c3aed 30%, #e2e8f0) transparent;
  }
  .rex-timeline::-webkit-scrollbar {
    width: 5px;
  }
  .rex-timeline::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, #7c3aed 35%, #cbd5e1);
    border-radius: 4px;
  }
  .rex-item {
    display: grid;
    grid-template-columns: 4px 1fr;
    gap: 0;
    width: 100%;
    margin-bottom: 0.4rem;
    padding: 0;
    border: 1px solid #e2e8f0;
    border-radius: 11px;
    background: var(--rex-surface);
    text-align: left;
    font: inherit;
    color: var(--rex-rail-text-strong);
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 1px 3px rgb(15 23 42 / 0.04);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.12s ease;
  }
  .rex-item:hover {
    border-color: color-mix(in srgb, #7c3aed 28%, #e2e8f0);
    box-shadow: 0 4px 14px color-mix(in srgb, #7c3aed 10%, transparent);
    transform: translateY(-1px);
  }
  .rex-item--on {
    border-color: var(--rex-accent);
    background: var(--rex-accent-soft);
    box-shadow:
      0 0 0 1px color-mix(in srgb, #7c3aed 22%, transparent),
      0 6px 20px color-mix(in srgb, #7c3aed 14%, transparent);
  }
  .rex-item__stripe {
    background: var(--rex-accent);
  }
  .rex-item[data-result='success'] .rex-item__stripe {
    background: var(--rex-ok);
  }
  .rex-item[data-result='warning'] .rex-item__stripe {
    background: var(--rex-warn);
  }
  .rex-item[data-result='error'] .rex-item__stripe {
    background: var(--rex-err);
  }
  .rex-item__body {
    padding: 0.55rem 0.65rem 0.5rem;
    min-width: 0;
  }
  .rex-item__row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.35rem;
  }
  .rex-item__row strong {
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--rex-ink);
  }
  .rex-item__time {
    font-size: 0.62rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--rex-accent);
    flex-shrink: 0;
  }
  .rex-item__target {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.62rem;
    color: var(--rex-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rex-item__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.35rem;
  }
  .rex-pill {
    font-size: 0.52rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    padding: 0.14rem 0.4rem;
    border-radius: 999px;
  }
  .rex-pill[data-result='success'] {
    color: #047857;
    background: color-mix(in srgb, #10b981 14%, #fff);
  }
  .rex-pill[data-result='warning'] {
    color: #b45309;
    background: color-mix(in srgb, #f59e0b 16%, #fff);
  }
  .rex-pill[data-result='error'] {
    color: #b91c1c;
    background: color-mix(in srgb, #ef4444 14%, #fff);
  }
  .rex-item__dur {
    font-size: 0.58rem;
    font-weight: 600;
    color: var(--rex-muted);
  }
  .rex-item__steps {
    margin-left: auto;
    font-size: 0.58rem;
    font-weight: 800;
    color: var(--rex-accent);
  }
  .rex-item__bar {
    display: block;
    height: 3px;
    margin-top: 0.35rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--rex-accent) 55%, #e2e8f0);
  }
  .rex-item[data-result='success'] .rex-item__bar {
    background: var(--rex-ok);
  }
  .rex-item[data-result='warning'] .rex-item__bar {
    background: var(--rex-warn);
  }
  .rex-item[data-result='error'] .rex-item__bar {
    background: var(--rex-err);
  }
  .rex-empty {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.74rem;
    line-height: 1.55;
    color: var(--rex-muted);
  }
  .rex-stage {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: var(--rex-stage);
  }
  .rex-stage__head {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.75rem;
    background: var(--rex-surface);
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .rex-stage__head[data-result='success'] {
    border-bottom-color: color-mix(in srgb, var(--rex-ok) 35%, #e2e8f0);
    background: linear-gradient(90deg, color-mix(in srgb, #10b981 6%, #fff) 0%, #fff 55%);
  }
  .rex-stage__head[data-result='warning'] {
    border-bottom-color: color-mix(in srgb, var(--rex-warn) 35%, #e2e8f0);
    background: linear-gradient(90deg, color-mix(in srgb, #f59e0b 7%, #fff) 0%, #fff 55%);
  }
  .rex-stage__head[data-result='error'] {
    border-bottom-color: color-mix(in srgb, var(--rex-err) 35%, #e2e8f0);
    background: linear-gradient(90deg, color-mix(in srgb, #ef4444 6%, #fff) 0%, #fff 55%);
  }
  .rex-stage__status {
    display: grid;
    place-items: center;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 10px;
    background: var(--rex-accent-mid);
    color: var(--rex-accent);
    flex-shrink: 0;
  }
  .rex-stage__head[data-result='success'] .rex-stage__status {
    color: var(--rex-ok);
    background: color-mix(in srgb, #10b981 12%, #fff);
  }
  .rex-stage__head[data-result='warning'] .rex-stage__status {
    color: var(--rex-warn);
    background: color-mix(in srgb, #f59e0b 14%, #fff);
  }
  .rex-stage__head[data-result='error'] .rex-stage__status {
    color: var(--rex-err);
    background: color-mix(in srgb, #ef4444 12%, #fff);
  }
  .rex-stage__status mat-icon {
    font-size: 1.35rem;
    width: 1.35rem;
    height: 1.35rem;
  }
  .rex-stage__titles {
    flex: 1;
    min-width: 0;
  }
  .rex-stage__titles h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--rex-ink);
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rex-stage__titles p {
    margin: 0.2rem 0 0;
    font-size: 0.68rem;
    color: var(--rex-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rex-stage__expand {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid color-mix(in srgb, #7c3aed 22%, #e2e8f0);
    border-radius: 10px;
    background: var(--rex-accent-soft);
    font: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--rex-accent);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .rex-stage__expand:hover {
    border-color: var(--rex-accent);
    background: var(--rex-accent-mid);
  }
  .rex-stage__expand mat-icon {
    font-size: 1rem;
    width: 1rem;
    height: 1rem;
  }
  .rex-stage {
    min-height: 0;
    overflow: hidden;
  }
  .rex-stage__body {
    flex: 1;
    min-height: 0;
    padding: 0.35rem 0.45rem 0.45rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .rex-stage__body app-runbook-execution-detail-panel {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    height: 100%;
  }
  .rex-stage__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    padding: 2rem;
    text-align: center;
    background: var(--rex-surface);
    margin: 0.65rem;
    border-radius: 14px;
    border: 1px dashed #cbd5e1;
  }
  .rex-stage__empty-icon {
    width: 4rem;
    height: 4rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--rex-accent-soft);
    color: var(--rex-accent);
  }
  .rex-stage__empty-icon mat-icon {
    font-size: 2rem;
    width: 2rem;
    height: 2rem;
  }
  .rex-stage__empty h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--rex-ink);
  }
  .rex-stage__empty p {
    margin: 0;
    max-width: 22rem;
    font-size: 0.8rem;
    line-height: 1.55;
    color: var(--rex-muted);
  }
  .runbooks-executions-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: calc(100dvh - 120px);
    max-height: none;
    height: 100%;
    overflow: hidden;
    padding: 0;
    background: transparent;
    border-radius: 0;
  }
  @media (max-width: 960px) {
    .rex {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(280px, 1fr);
    }
    .rex-rail {
      max-height: 42vh;
      border-right: none;
      border-bottom: 1px solid var(--rex-rail-border);
    }
    .rex-rail__list {
      max-height: 22vh;
    }
  }
`
