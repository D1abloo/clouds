export const CHANGE_FORM_DIALOG_STYLES = `
  .chg-form-dialog {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: min(520px, 76vh);
    box-sizing: border-box;
    padding: 0.85rem 1.1rem 0.75rem;
    color: #0f172a;
  }
  .chg-form-dialog__top {
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.15rem 0 0.65rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .chg-form-dialog__brand {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    min-width: 0;
  }
  .chg-form-dialog__glyph {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: linear-gradient(145deg, #1e293b 0%, #334155 100%);
    box-shadow: 0 4px 14px color-mix(in srgb, #1e293b 22%, transparent);
  }
  .chg-form-dialog__glyph mat-icon {
    font-size: 1.35rem;
    width: 1.35rem;
    height: 1.35rem;
    color: #f8fafc;
  }
  .chg-form-dialog__glyph--mw {
    background: linear-gradient(145deg, #0f766e 0%, #14b8a6 100%);
    box-shadow: 0 4px 14px color-mix(in srgb, #0d9488 24%, transparent);
  }
  .chg-form-dialog__brand h2 {
    margin: 0 0 0.2rem;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.25;
  }
  .chg-form-dialog__brand p {
    margin: 0;
    font-size: 0.74rem;
    color: #64748b;
    line-height: 1.45;
    max-width: 26rem;
  }
  .chg-form-dialog__progress {
    flex-shrink: 0;
    text-align: right;
  }
  .chg-form-dialog__progress span {
    display: block;
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 0.2rem;
  }
  .chg-form-dialog__progress strong {
    font-size: 0.82rem;
    font-weight: 700;
    color: #334155;
  }
  .chg-form-dialog__bar {
    width: 5.5rem;
    height: 4px;
    margin-top: 0.35rem;
    margin-left: auto;
    border-radius: 999px;
    background: #e2e8f0;
    overflow: hidden;
  }
  .chg-form-dialog__bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #1e293b, #475569);
    transition: width 0.25s ease;
  }
  .chg-form-dialog__bar--mw i {
    background: linear-gradient(90deg, #0f766e, #14b8a6);
  }
  .chg-form-dialog__shell {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 10.5rem minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 0;
  }
  .chg-form-dialog__nav {
    grid-column: 1;
    grid-row: 1 / span 2;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 0.65rem 0.75rem 0;
    border-right: 1px solid #f1f5f9;
  }
  .chg-form-dialog__nav-item {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    width: 100%;
    padding: 0.5rem 0.55rem;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .chg-form-dialog__nav-item:hover {
    background: #f8fafc;
  }
  .chg-form-dialog__nav-item--on {
    background: #f1f5f9;
    border-color: #e2e8f0;
  }
  .chg-form-dialog__nav-item--done .chg-form-dialog__nav-num {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
  }
  .chg-form-dialog__nav-num {
    flex-shrink: 0;
    width: 1.35rem;
    height: 1.35rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.62rem;
    font-weight: 700;
    color: #64748b;
  }
  .chg-form-dialog__nav-item--on .chg-form-dialog__nav-num {
    background: #1e293b;
    border-color: #1e293b;
    color: #fff;
  }
  .chg-form-dialog__nav-item--on.chg-form-dialog__nav-item--mw .chg-form-dialog__nav-num {
    background: #0f766e;
    border-color: #0f766e;
  }
  .chg-form-dialog__nav-text {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    min-width: 0;
  }
  .chg-form-dialog__nav-text strong {
    font-size: 0.68rem;
    font-weight: 700;
    color: #334155;
    line-height: 1.2;
  }
  .chg-form-dialog__nav-text span {
    font-size: 0.58rem;
    color: #94a3b8;
    line-height: 1.3;
  }
  .chg-form-dialog__body {
    grid-column: 2;
    grid-row: 1;
    min-height: 300px;
    max-height: none;
    overflow-y: auto;
    scrollbar-width: thin;
    padding: 0.65rem 0 0.65rem 0.85rem !important;
  }
  .chg-form-dialog__section {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    animation: chgFormFade 0.22s ease;
  }
  @keyframes chgFormFade {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .chg-form-dialog__section-head {
    margin-bottom: 0.15rem;
  }
  .chg-form-dialog__section-head h3 {
    margin: 0 0 0.15rem;
    font-size: 0.82rem;
    font-weight: 700;
    color: #0f172a;
  }
  .chg-form-dialog__section-head p {
    margin: 0;
    font-size: 0.68rem;
    color: #64748b;
    line-height: 1.45;
  }
  .chg-form-dialog__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }
  .chg-form-dialog__field {
    width: 100%;
  }
  .chg-form-dialog__block {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .chg-form-dialog__label {
    font-size: 0.58rem;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #94a3b8;
  }
  .chg-form-dialog__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chg-form-dialog__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    padding: 0.38rem 0.65rem;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: #fff;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .chg-form-dialog__chip:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }
  .chg-form-dialog__chip--on {
    border-color: #1e293b;
    background: #f8fafc;
    box-shadow: 0 0 0 1px #1e293b inset;
    color: #0f172a;
  }
  .chg-form-dialog__chip--on[data-risk='critical'] {
    border-color: #dc2626;
    box-shadow: 0 0 0 1px #dc2626 inset;
    color: #991b1b;
  }
  .chg-form-dialog__chip--on[data-risk='high'] {
    border-color: #ea580c;
    box-shadow: 0 0 0 1px #ea580c inset;
    color: #c2410c;
  }
  .chg-form-dialog__chip--on[data-risk='medium'] {
    border-color: #d97706;
    box-shadow: 0 0 0 1px #d97706 inset;
    color: #b45309;
  }
  .chg-form-dialog__chip--on[data-risk='low'] {
    border-color: #059669;
    box-shadow: 0 0 0 1px #059669 inset;
    color: #047857;
  }
  .chg-form-dialog__chip mat-icon {
    font-size: 0.9rem;
    width: 0.9rem;
    height: 0.9rem;
  }
  .chg-form-dialog__card {
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .chg-form-dialog__card p {
    margin: 0;
    font-size: 0.65rem;
    color: #64748b;
    line-height: 1.45;
  }
  .chg-form-dialog__card strong {
    display: block;
    font-size: 0.68rem;
    color: #334155;
    margin-bottom: 0.15rem;
  }
  .chg-form-dialog__foot {
    grid-column: 1 / -1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.65rem 0 0;
    margin-top: 0.15rem;
    border-top: 1px solid #e2e8f0;
  }
  .chg-form-dialog__foot-hint {
    font-size: 0.62rem;
    color: #94a3b8;
  }
  .chg-form-dialog__foot-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: auto;
  }
  .chg-form-dialog__foot-actions button mat-icon {
    font-size: 1rem;
    width: 1rem;
    height: 1rem;
    margin-right: 0.15rem;
  }
  .chg-form-dialog__mw-option {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    padding: 0.15rem 0;
  }
  .chg-form-dialog__mw-option strong {
    font-size: 0.72rem;
    font-weight: 600;
  }
  .chg-form-dialog__mw-option span {
    font-size: 0.6rem;
    color: #64748b;
  }
  @media (max-width: 640px) {
    .chg-form-dialog__shell {
      grid-template-columns: 1fr;
    }
    .chg-form-dialog__nav {
      flex-direction: row;
      overflow-x: auto;
      border-right: none;
      border-bottom: 1px solid #f1f5f9;
      padding: 0.5rem 0;
    }
    .chg-form-dialog__nav-item {
      min-width: 8.5rem;
    }
    .chg-form-dialog__row {
      grid-template-columns: 1fr;
    }
  }
`
