export const PUBLIC_THEME = `
.pub { --c-bg:#0f172a; --c-accent:#0284c7; --c-accent2:#6366f1; --c-text:#0f172a; --c-muted:#64748b; --c-surface:#fff; font-family:'Segoe UI',system-ui,sans-serif; color:var(--c-text); }
.pub-wrap { max-width:1120px; margin:0 auto; padding:0 1.25rem; }
.pub-hero { padding:5rem 0 3rem; background:linear-gradient(160deg,#0c4a6e 0%,#0f172a 50%,#1e1b4b 100%); color:#fff; }
.pub-hero h1 { font-size:clamp(2rem,5vw,3rem); font-weight:800; letter-spacing:-.03em; margin:0 0 1rem; line-height:1.1; }
.pub-hero p { font-size:1.05rem; opacity:.9; max-width:560px; line-height:1.6; }
.pub-section { padding:4rem 0; }
.pub-section--alt { background:#f8fafc; }
.pub-section h2 { font-size:1.75rem; font-weight:800; margin:0 0 .5rem; letter-spacing:-.02em; }
.pub-section .sub { color:var(--c-muted); margin:0 0 2rem; max-width:640px; line-height:1.6; }
.pub-grid { display:grid; gap:1.25rem; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
.pub-card { background:var(--c-surface); border:1px solid #e2e8f0; border-radius:14px; padding:1.25rem; box-shadow:0 4px 20px rgba(15,23,42,.04); transition:transform .2s,box-shadow .2s; }
.pub-card:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(15,23,42,.08); }
.pub-card h3 { margin:0 0 .35rem; font-size:1rem; font-weight:700; }
.pub-card p { margin:0; font-size:.85rem; color:var(--c-muted); line-height:1.55; }
.pub-mock { background:linear-gradient(135deg,#1e293b,#0f172a); border-radius:12px; padding:1rem; color:#94a3b8; font-size:.7rem; min-height:140px; position:relative; overflow:hidden; }
.pub-mock__label { position:absolute; top:.5rem; right:.5rem; background:rgba(255,255,255,.1); padding:.2rem .45rem; border-radius:4px; font-size:.62rem; color:#cbd5e1; }
.pub-mock__bar { height:8px; background:rgba(255,255,255,.08); border-radius:4px; margin-bottom:.5rem; }
.pub-mock__bar--w60 { width:60%; } .pub-mock__bar--w80 { width:80%; } .pub-mock__bar--w40 { width:40%; }
.pub-btn { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; padding:.7rem 1.25rem; border-radius:10px; font-weight:600; font-size:.875rem; text-decoration:none; border:none; cursor:pointer; transition:transform .15s,box-shadow .15s; }
.pub-btn--primary { background:var(--c-accent); color:#fff; }
.pub-btn--primary:hover { transform:translateY(-1px); box-shadow:0 8px 20px rgba(2,132,199,.35); }
.pub-btn--ghost { background:rgba(255,255,255,.12); color:#fff; border:1px solid rgba(255,255,255,.25); }
.pub-btn--outline { background:#fff; color:var(--c-text); border:1px solid #e2e8f0; }
.pub-actions { display:flex; flex-wrap:wrap; gap:.75rem; margin-top:1.5rem; }
.pub-icon { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#0284c7,#6366f1); display:grid; place-items:center; color:#fff; font-size:1rem; margin-bottom:.65rem; }
.pub-faq details { border:1px solid #e2e8f0; border-radius:10px; padding:.85rem 1rem; margin-bottom:.65rem; background:#fff; }
.pub-faq summary { cursor:pointer; font-weight:600; font-size:.9rem; }
.pub-faq p { margin:.65rem 0 0; font-size:.85rem; color:var(--c-muted); line-height:1.55; }
@media (prefers-reduced-motion:reduce) { .pub-card:hover,.pub-btn:hover { transform:none; } }
`
