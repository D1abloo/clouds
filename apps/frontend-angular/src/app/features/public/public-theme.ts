export const PUBLIC_THEME = `
.pub {
  --pub-accent: #0284c7;
  --pub-accent2: #6366f1;
  --pub-accent3: #06b6d4;
  --pub-dark: #0f172a;
  --pub-muted: #64748b;
  --pub-surface: #ffffff;
  --pub-border: #e2e8f0;
  --pub-glow: rgba(2, 132, 199, 0.22);
  font-family: Inter, 'Segoe UI', system-ui, sans-serif;
  color: var(--pub-dark);
  -webkit-font-smoothing: antialiased;
}

.pub-wrap { max-width: 1140px; margin: 0 auto; padding: 0 1.35rem; }

/* —— Hero —— */
.pub-hero {
  position: relative;
  padding: clamp(3.5rem, 8vw, 6rem) 0 clamp(3rem, 6vw, 4.5rem);
  color: #fff;
  overflow: hidden;
  background: linear-gradient(155deg, #0c4a6e 0%, #0f172a 42%, #1e1b4b 100%);
}
.pub-hero::before,
.pub-hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.pub-hero::before {
  width: min(520px, 70vw);
  height: min(520px, 70vw);
  top: -120px;
  right: -80px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 70%);
}
.pub-hero::after {
  width: min(400px, 60vw);
  height: min(400px, 60vw);
  bottom: -100px;
  left: -60px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, transparent 70%);
}
.pub-hero__grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 2.5rem;
  align-items: center;
}
.pub-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0.85;
  margin: 0 0 1rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.pub-hero h1 {
  font-size: clamp(2.1rem, 5.2vw, 3.35rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  margin: 0 0 1rem;
  line-height: 1.08;
}
.pub-hero p {
  font-size: clamp(1rem, 2vw, 1.12rem);
  opacity: 0.92;
  max-width: 540px;
  line-height: 1.65;
  margin: 0;
}
.pub-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem 2rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.pub-hero__stat strong {
  display: block;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.pub-hero__stat span {
  font-size: 0.78rem;
  opacity: 0.75;
}

/* —— Page headers (inner pages) —— */
.pub-page-hero {
  padding: clamp(2.5rem, 5vw, 3.75rem) 0 clamp(2rem, 4vw, 2.75rem);
  background: linear-gradient(160deg, #f0f9ff 0%, #f8fafc 55%, #fff 100%);
  border-bottom: 1px solid var(--pub-border);
}
.pub-page-hero h1 {
  font-size: clamp(1.85rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 0.65rem;
  line-height: 1.12;
}
.pub-page-hero p {
  margin: 0;
  max-width: 620px;
  color: var(--pub-muted);
  line-height: 1.65;
  font-size: 1.02rem;
}
.pub-page-body { padding: clamp(2rem, 4vw, 3.5rem) 0 4rem; }

/* —— Sections —— */
.pub-section { padding: clamp(3rem, 6vw, 4.5rem) 0; }
.pub-section--alt { background: linear-gradient(180deg, #f8fafc 0%, #fff 100%); }
.pub-section h2 {
  font-size: clamp(1.5rem, 3vw, 1.85rem);
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.025em;
}
.pub-section .sub {
  color: var(--pub-muted);
  margin: 0 0 2rem;
  max-width: 640px;
  line-height: 1.65;
  font-size: 0.98rem;
}

/* —— Grid & cards —— */
.pub-grid { display: grid; gap: 1.15rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.pub-card {
  background: var(--pub-surface);
  border: 1px solid var(--pub-border);
  border-radius: 16px;
  padding: 1.35rem;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.04);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.pub-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.09);
  border-color: #cbd5e1;
}
.pub-card h3 { margin: 0 0 0.4rem; font-size: 1.02rem; font-weight: 700; }
.pub-card p { margin: 0; font-size: 0.875rem; color: var(--pub-muted); line-height: 1.58; }
.pub-card--feature {
  background: linear-gradient(145deg, #fff 0%, #f8fafc 100%);
}
.pub-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--pub-accent), var(--pub-accent2));
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 8px 20px var(--pub-glow);
}

/* —— Dashboard mockups —— */
.pub-mock {
  position: relative;
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-radius: 16px;
  padding: 0;
  color: #94a3b8;
  font-size: 0.7rem;
  min-height: 160px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}
.pub-mock__chrome {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.65rem 0.85rem;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.pub-mock__dot { width: 8px; height: 8px; border-radius: 50%; }
.pub-mock__dot--r { background: #f87171; }
.pub-mock__dot--y { background: #fbbf24; }
.pub-mock__dot--g { background: #4ade80; }
.pub-mock__body { display: grid; grid-template-columns: 72px 1fr; min-height: 140px; }
.pub-mock__sidebar {
  padding: 0.65rem 0.5rem;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.pub-mock__nav { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.1); }
.pub-mock__nav--active { background: rgba(2, 132, 199, 0.55); width: 80%; }
.pub-mock__main { padding: 0.85rem; display: flex; flex-direction: column; gap: 0.55rem; }
.pub-mock__kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem; }
.pub-mock__kpi {
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.04);
}
.pub-mock__chart {
  flex: 1;
  min-height: 56px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(2, 132, 199, 0.15) 0%, transparent 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}
.pub-mock__chart::after {
  content: '';
  position: absolute;
  inset: 30% 8% 12% 8%;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), rgba(99, 102, 241, 0.4), transparent);
  border-radius: 4px;
  opacity: 0.7;
}
.pub-mock__label {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 2;
  background: rgba(15, 23, 42, 0.85);
  padding: 0.22rem 0.5rem;
  border-radius: 6px;
  font-size: 0.6rem;
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.pub-mock__bar { height: 7px; background: rgba(255, 255, 255, 0.08); border-radius: 4px; margin-bottom: 0.45rem; }
.pub-mock__bar--w60 { width: 60%; }
.pub-mock__bar--w80 { width: 80%; }
.pub-mock__bar--w40 { width: 40%; }

/* —— Buttons —— */
.pub-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.72rem 1.35rem;
  border-radius: 11px;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}
.pub-btn--primary {
  background: linear-gradient(135deg, var(--pub-accent), #0369a1);
  color: #fff;
  box-shadow: 0 4px 14px var(--pub-glow);
}
.pub-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(2, 132, 199, 0.4);
}
.pub-btn--ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
}
.pub-btn--ghost:hover { background: rgba(255, 255, 255, 0.16); }
.pub-btn--outline {
  background: #fff;
  color: var(--pub-dark);
  border: 1px solid var(--pub-border);
}
.pub-btn--outline:hover { border-color: #94a3b8; background: #f8fafc; }
.pub-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.65rem; }

/* —— FAQ & CTA —— */
.pub-faq details {
  border: 1px solid var(--pub-border);
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
  margin-bottom: 0.7rem;
  background: #fff;
  transition: box-shadow 0.2s ease;
}
.pub-faq details[open] { box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
.pub-faq summary { cursor: pointer; font-weight: 600; font-size: 0.92rem; list-style: none; }
.pub-faq summary::-webkit-details-marker { display: none; }
.pub-faq p { margin: 0.7rem 0 0; font-size: 0.875rem; color: var(--pub-muted); line-height: 1.58; }
.pub-cta {
  background: linear-gradient(135deg, #0c4a6e 0%, #312e81 100%);
  color: #fff;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.pub-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 50%, rgba(6, 182, 212, 0.2), transparent 55%);
  pointer-events: none;
}
.pub-cta__inner { position: relative; z-index: 1; }
.pub-cta__inner h2 { color: #fff; }
.pub-cta__inner p { opacity: 0.92; max-width: 520px; margin: 0 auto; }
.pub-cta .pub-btn--outline { background: transparent; color: #fff; border-color: rgba(255, 255, 255, 0.35); }
.pub-cta .pub-actions { justify-content: center; }

/* —— Use case cards —— */
.pub-case {
  margin-bottom: 1rem;
  border-left: 3px solid var(--pub-accent);
}
.pub-case p { margin: 0.4rem 0; font-size: 0.875rem; }
.pub-case strong { color: var(--pub-dark); }

/* —— Pricing —— */
.pub-pricing-card {
  max-width: 440px;
  margin: 0 auto;
  text-align: center;
  padding: 2.25rem 2rem;
  background: linear-gradient(160deg, #fff 0%, #f0f9ff 100%);
  border: 1px solid #bae6fd;
  box-shadow: 0 20px 50px rgba(2, 132, 199, 0.12);
}
.pub-pricing-card h2 { margin: 0 0 0.5rem; font-size: 1.5rem; }
.pub-pricing-card .pub-badge {
  display: inline-block;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--pub-accent);
  margin-bottom: 0.75rem;
}

@media (min-width: 900px) {
  .pub-hero__grid { grid-template-columns: 1.05fr 0.95fr; gap: 3rem; }
}

@media (prefers-reduced-motion: reduce) {
  .pub-card:hover, .pub-btn:hover { transform: none; }
}
`
