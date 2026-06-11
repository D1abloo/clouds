import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'
import { SPENDLYX_CONTACT_EMAIL } from './public.constants'
import {
  DOC_ARTICLES,
  DOC_CATEGORIES,
  DocArticle,
  DocBlock,
  getDocById,
  searchDocs,
} from './docs.content'

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, MatIconModule],
  selector: 'app-docs-page',
  template: `
    <header class="pub-docs-hero">
      <div class="pub-wrap pub-docs-hero__inner">
        <p class="pub-docs-hero__eyebrow">Centro de ayuda</p>
        <h1>Documentación de usuario</h1>
        <p>
          Guías detalladas para operar Spendlyx: desde tu primera cuenta hasta facturación,
          automatización y seguridad. Escrito para equipos operativos, sin jerga interna.
        </p>
        <div class="pub-docs-hero__search">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input
            type="search"
            placeholder="Buscar guías, módulos o palabras clave…"
            [(ngModel)]="query"
            (ngModelChange)="handleSearchChange()"
            aria-label="Buscar en la documentación"
          />
          @if (query.trim()) {
            <button type="button" class="pub-docs-hero__clear" (click)="clearSearch()" aria-label="Limpiar búsqueda">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <div class="pub-docs-hero__chips">
          @for (chip of quickChips; track chip.id) {
            <button type="button" class="pub-docs-chip" (click)="openArticle(chip.id)">{{ chip.label }}</button>
          }
        </div>
      </div>
    </header>

    <div class="pub pub-docs">
      <div class="pub-wrap pub-docs__shell">
        <button
          type="button"
          class="pub-docs__nav-toggle pub-btn pub-btn--outline"
          (click)="navOpen.set(!navOpen())"
          [attr.aria-expanded]="navOpen()"
        >
          <mat-icon>{{ navOpen() ? 'close' : 'menu_book' }}</mat-icon>
          {{ navOpen() ? 'Cerrar índice' : 'Índice de guías' }}
        </button>

        <div class="pub-docs__layout" [class.pub-docs__layout--nav-open]="navOpen()">
          <aside class="pub-docs__sidebar" [attr.aria-hidden]="!navOpen() && isMobile() ? true : null">
            <div class="pub-docs__sidebar-head">
              <strong>{{ filteredCount() }} guías</strong>
              <span>{{ DOC_CATEGORIES.length }} categorías</span>
            </div>

            @if (query.trim() && searchResults().length === 0) {
              <p class="pub-docs__empty">Sin resultados para «{{ query }}». Prueba «AWS», «login» o «facturación».</p>
            }

            @for (cat of visibleCategories(); track cat.id) {
              <section class="pub-docs__cat">
                <button
                  type="button"
                  class="pub-docs__cat-btn"
                  [class.pub-docs__cat-btn--open]="expandedCats().has(cat.id)"
                  (click)="toggleCategory(cat.id)"
                  [attr.aria-expanded]="expandedCats().has(cat.id)"
                >
                  <mat-icon aria-hidden="true">{{ cat.icon }}</mat-icon>
                  <span>
                    <strong>{{ cat.title }}</strong>
                    <em>{{ cat.description }}</em>
                  </span>
                  <mat-icon class="pub-docs__chevron" aria-hidden="true">
                    {{ expandedCats().has(cat.id) ? 'expand_less' : 'expand_more' }}
                  </mat-icon>
                </button>
                @if (expandedCats().has(cat.id)) {
                  <nav class="pub-docs__articles" [attr.aria-label]="'Guías de ' + cat.title">
                    @for (doc of articlesForCategory(cat.id); track doc.id) {
                      <button
                        type="button"
                        class="pub-docs__article-btn"
                        [class.active]="activeId() === doc.id"
                        (click)="openArticle(doc.id)"
                      >
                        <mat-icon aria-hidden="true">{{ doc.icon }}</mat-icon>
                        <span>{{ doc.title }}</span>
                        <em>{{ doc.readMinutes }} min</em>
                      </button>
                    }
                  </nav>
                }
              </section>
            }
          </aside>

          @if (current(); as doc) {
            <article class="pub-docs__main">
              <nav class="pub-docs__breadcrumb" aria-label="Ruta">
                <button type="button" (click)="openArticle('intro')">Docs</button>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
                <span>{{ categoryTitle(doc.categoryId) }}</span>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
                <span aria-current="page">{{ doc.title }}</span>
              </nav>

              <header class="pub-docs__article-head">
                <div class="pub-docs__article-icon" aria-hidden="true">
                  <mat-icon>{{ doc.icon }}</mat-icon>
                </div>
                <div>
                  <h1>{{ doc.title }}</h1>
                  <p class="pub-docs__article-desc">{{ doc.description }}</p>
                  <div class="pub-docs__meta">
                    <span><mat-icon aria-hidden="true">schedule</mat-icon> {{ doc.readMinutes }} min lectura</span>
                    <span><mat-icon aria-hidden="true">folder</mat-icon> {{ categoryTitle(doc.categoryId) }}</span>
                    @for (tag of doc.tags.slice(0, 3); track tag) {
                      <span class="pub-docs__tag">#{{ tag }}</span>
                    }
                  </div>
                </div>
              </header>

              @if (toc(doc).length) {
                <aside class="pub-docs__toc-inline" aria-label="En esta página">
                  <strong>En esta página</strong>
                  <ul>
                    @for (item of toc(doc); track item.anchor) {
                      <li>
                        <a [href]="'#' + item.anchor" (click)="handleTocClick($event, item.anchor)">{{ item.text }}</a>
                      </li>
                    }
                  </ul>
                </aside>
              }

              <div class="pub-docs__body">
                @for (block of doc.blocks; track $index) {
                  @switch (block.type) {
                    @case ('paragraph') {
                      <p class="pub-docs__p">{{ block.text }}</p>
                    }
                    @case ('heading') {
                      @if (block.level === 2) {
                        <h2 [id]="block.anchor" class="pub-docs__h2">{{ block.text }}</h2>
                      } @else {
                        <h3 [id]="block.anchor" class="pub-docs__h3">{{ block.text }}</h3>
                      }
                    }
                    @case ('list') {
                      @if (block.ordered) {
                        <ol class="pub-docs__list">
                          @for (item of block.items; track item) { <li>{{ item }}</li> }
                        </ol>
                      } @else {
                        <ul class="pub-docs__list">
                          @for (item of block.items; track item) { <li>{{ item }}</li> }
                        </ul>
                      }
                    }
                    @case ('steps') {
                      <ol class="pub-docs__steps">
                        @for (step of block.items; track step.title; let i = $index) {
                          <li>
                            <span class="pub-docs__step-num">{{ i + 1 }}</span>
                            <div>
                              <strong>{{ step.title }}</strong>
                              <p>{{ step.body }}</p>
                            </div>
                          </li>
                        }
                      </ol>
                    }
                    @case ('callout') {
                      <aside class="pub-docs__callout pub-docs__callout--{{ block.variant }}" role="note">
                        @if (block.title) { <strong>{{ block.title }}</strong> }
                        <p>{{ block.text }}</p>
                      </aside>
                    }
                    @case ('table') {
                      <div class="pub-docs__table-wrap">
                        <table class="pub-docs__table">
                          <thead>
                            <tr>
                              @for (h of block.headers; track h) { <th>{{ h }}</th> }
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of block.rows; track row.join()) {
                              <tr>
                                @for (cell of row; track cell) { <td>{{ cell }}</td> }
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  }
                }
              </div>

              @if (doc.related?.length) {
                <section class="pub-docs__related">
                  <h2 class="pub-docs__h2">Artículos relacionados</h2>
                  <div class="pub-docs__related-grid">
                    @for (relId of doc.related!; track relId) {
                      @if (getDocById(relId); as rel) {
                        <button type="button" class="pub-docs__related-card" (click)="openArticle(rel.id)">
                          <mat-icon aria-hidden="true">{{ rel.icon }}</mat-icon>
                          <strong>{{ rel.title }}</strong>
                          <span>{{ rel.description }}</span>
                        </button>
                      }
                    }
                  </div>
                </section>
              }

              <footer class="pub-docs__article-footer">
                <div class="pub-docs__nav-prev-next">
                  @if (prevDoc(); as prev) {
                    <button type="button" class="pub-docs__nav-card" (click)="openArticle(prev.id)">
                      <span>Anterior</span>
                      <strong>{{ prev.title }}</strong>
                    </button>
                  }
                  @if (nextDoc(); as next) {
                    <button type="button" class="pub-docs__nav-card pub-docs__nav-card--next" (click)="openArticle(next.id)">
                      <span>Siguiente</span>
                      <strong>{{ next.title }}</strong>
                    </button>
                  }
                </div>
              </footer>
            </article>

            @if (toc(doc).length) {
              <aside class="pub-docs__toc-rail" aria-label="Tabla de contenidos">
                <strong>En esta página</strong>
                <ul>
                  @for (item of toc(doc); track item.anchor) {
                    <li>
                      <a
                        [href]="'#' + item.anchor"
                        [class.active]="activeAnchor() === item.anchor"
                        (click)="handleTocClick($event, item.anchor)"
                      >{{ item.text }}</a>
                    </li>
                  }
                </ul>
              </aside>
            }
          }
        </div>

        <section class="pub-docs__cta">
          <div class="pub-docs__cta-inner">
            <h2>¿Necesitas ayuda personalizada?</h2>
            <p>Nuestro equipo puede ayudarte con onboarding, integraciones cloud y despliegue en tu organización.</p>
            <div class="pub-actions">
              <a routerLink="/contacto" class="pub-btn pub-btn--primary">Contactar soporte</a>
              <a routerLink="/login" class="pub-btn pub-btn--outline">Ir al panel</a>
              <a [href]="'mailto:' + contactEmail" class="pub-btn pub-btn--outline">{{ contactEmail }}</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    PUBLIC_THEME,
    `
    .pub-docs-hero {
      padding: clamp(2.75rem, 6vw, 4rem) 0 clamp(2rem, 4vw, 2.75rem);
      background: linear-gradient(155deg, #0c4a6e 0%, #0f172a 48%, #1e1b4b 100%);
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .pub-docs-hero::before {
      content: '';
      position: absolute;
      inset: -20% 0 0;
      background: radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.22), transparent 50%);
      pointer-events: none;
    }
    .pub-docs-hero__inner { position: relative; z-index: 1; max-width: 720px; }
    .pub-docs-hero__eyebrow {
      margin: 0 0 0.65rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.85;
    }
    .pub-docs-hero h1 {
      margin: 0 0 0.75rem;
      font-size: clamp(1.9rem, 4.5vw, 2.65rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .pub-docs-hero p {
      margin: 0 0 1.35rem;
      opacity: 0.9;
      line-height: 1.65;
      font-size: 1.02rem;
    }
    .pub-docs-hero__search {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 14px;
      padding: 0.55rem 0.85rem;
      backdrop-filter: blur(10px);
    }
    .pub-docs-hero__search mat-icon { opacity: 0.75; font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .pub-docs-hero__search input {
      flex: 1;
      border: none;
      background: transparent;
      color: #fff;
      font: inherit;
      font-size: 0.95rem;
      min-width: 0;
    }
    .pub-docs-hero__search input::placeholder { color: rgba(255, 255, 255, 0.55); }
    .pub-docs-hero__search input:focus { outline: none; }
    .pub-docs-hero__clear {
      border: none;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      display: grid;
      place-items: center;
      padding: 0.2rem;
      min-width: 32px;
      min-height: 32px;
    }
    .pub-docs-hero__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-top: 1rem;
    }
    .pub-docs-chip {
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .pub-docs-chip:hover { background: rgba(255, 255, 255, 0.16); }

    .pub-docs { padding: 0 0 3rem; background: #f8fafc; }
    .pub-docs__shell { padding-top: 1.5rem; }
    .pub-docs__nav-toggle {
      display: none;
      width: 100%;
      margin-bottom: 1rem;
      min-height: 44px;
    }
    .pub-docs__layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 1.75rem;
      align-items: start;
    }
    .pub-docs__layout--nav-open .pub-docs__sidebar { display: block; }

    .pub-docs__sidebar {
      position: sticky;
      top: 88px;
      max-height: calc(100dvh - 100px);
      overflow-y: auto;
      scrollbar-width: thin;
      background: #fff;
      border: 1px solid var(--pub-border);
      border-radius: 16px;
      padding: 0.85rem;
      box-shadow: 0 8px 32px rgba(15, 23, 42, 0.06);
    }
    .pub-docs__sidebar-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 0.35rem 0.5rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      color: var(--pub-muted);
    }
    .pub-docs__sidebar-head strong { color: var(--pub-dark); font-size: 0.82rem; }
    .pub-docs__empty {
      font-size: 0.82rem;
      color: var(--pub-muted);
      padding: 0.5rem;
      margin: 0;
      line-height: 1.5;
    }
    .pub-docs__cat { margin-bottom: 0.35rem; }
    .pub-docs__cat-btn {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      width: 100%;
      text-align: left;
      border: none;
      background: none;
      padding: 0.55rem 0.5rem;
      border-radius: 10px;
      cursor: pointer;
      color: var(--pub-dark);
      transition: background 0.15s;
    }
    .pub-docs__cat-btn:hover, .pub-docs__cat-btn--open { background: #f0f9ff; }
    .pub-docs__cat-btn > mat-icon:first-child {
      color: var(--pub-accent);
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
      margin-top: 0.15rem;
    }
    .pub-docs__cat-btn span { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
    .pub-docs__cat-btn strong { font-size: 0.82rem; font-weight: 700; }
    .pub-docs__cat-btn em {
      font-size: 0.68rem;
      color: var(--pub-muted);
      font-style: normal;
      line-height: 1.35;
    }
    .pub-docs__chevron { color: #94a3b8; margin-left: auto; }
    .pub-docs__articles { padding: 0.15rem 0 0.35rem 0.35rem; }
    .pub-docs__article-btn {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      width: 100%;
      text-align: left;
      border: none;
      background: none;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      color: #475569;
      transition: background 0.15s, color 0.15s;
    }
    .pub-docs__article-btn mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.7;
    }
    .pub-docs__article-btn span { flex: 1; }
    .pub-docs__article-btn em {
      font-size: 0.65rem;
      color: #94a3b8;
      font-style: normal;
    }
    .pub-docs__article-btn:hover, .pub-docs__article-btn.active {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
    }

    .pub-docs__main {
      background: #fff;
      border: 1px solid var(--pub-border);
      border-radius: 18px;
      padding: clamp(1.25rem, 3vw, 2.25rem);
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.05);
      min-width: 0;
    }
    .pub-docs__breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.72rem;
      color: var(--pub-muted);
      margin-bottom: 1.25rem;
    }
    .pub-docs__breadcrumb button {
      border: none;
      background: none;
      padding: 0;
      font: inherit;
      color: var(--pub-accent);
      cursor: pointer;
      font-weight: 600;
    }
    .pub-docs__breadcrumb mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .pub-docs__article-head {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .pub-docs__article-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--pub-accent), var(--pub-accent2));
      display: grid;
      place-items: center;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 8px 24px var(--pub-glow);
    }
    .pub-docs__article-icon mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    .pub-docs__article-head h1 {
      margin: 0 0 0.35rem;
      font-size: clamp(1.45rem, 3vw, 1.85rem);
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.15;
    }
    .pub-docs__article-desc {
      margin: 0 0 0.65rem;
      color: var(--pub-muted);
      line-height: 1.55;
      font-size: 0.95rem;
    }
    .pub-docs__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      font-size: 0.75rem;
      color: var(--pub-muted);
    }
    .pub-docs__meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .pub-docs__meta mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .pub-docs__tag {
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      font-weight: 600;
      color: #64748b;
    }

    .pub-docs__toc-inline {
      display: none;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.15rem;
      margin-bottom: 1.5rem;
    }
    .pub-docs__toc-inline strong {
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--pub-muted);
      margin-bottom: 0.5rem;
    }
    .pub-docs__toc-inline ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .pub-docs__toc-inline a {
      font-size: 0.82rem;
      color: var(--pub-accent);
      text-decoration: none;
      font-weight: 600;
    }

    .pub-docs__toc-rail {
      position: sticky;
      top: 88px;
      display: none;
      padding: 1rem 0 0 0.5rem;
      max-height: calc(100dvh - 100px);
      overflow-y: auto;
    }
    .pub-docs__toc-rail strong {
      display: block;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--pub-muted);
      margin-bottom: 0.65rem;
    }
    .pub-docs__toc-rail ul {
      margin: 0;
      padding: 0;
      list-style: none;
      border-left: 2px solid #e2e8f0;
    }
    .pub-docs__toc-rail li { margin: 0; }
    .pub-docs__toc-rail a {
      display: block;
      padding: 0.35rem 0 0.35rem 0.75rem;
      font-size: 0.78rem;
      color: var(--pub-muted);
      text-decoration: none;
      border-left: 2px solid transparent;
      margin-left: -2px;
      transition: color 0.15s, border-color 0.15s;
    }
    .pub-docs__toc-rail a:hover, .pub-docs__toc-rail a.active {
      color: var(--pub-accent);
      border-left-color: var(--pub-accent);
      font-weight: 600;
    }

    .pub-docs__p {
      margin: 0 0 1rem;
      line-height: 1.72;
      color: #475569;
      font-size: 0.95rem;
    }
    .pub-docs__h2 {
      margin: 2rem 0 0.75rem;
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--pub-dark);
      letter-spacing: -0.02em;
      scroll-margin-top: 96px;
    }
    .pub-docs__h3 {
      margin: 1.35rem 0 0.5rem;
      font-size: 1rem;
      font-weight: 700;
      color: #334155;
      scroll-margin-top: 96px;
    }
    .pub-docs__list {
      margin: 0 0 1.1rem;
      padding-left: 1.25rem;
      line-height: 1.65;
      color: #475569;
      font-size: 0.92rem;
    }
    .pub-docs__list li { margin-bottom: 0.4rem; }
    .pub-docs__steps {
      margin: 0 0 1.25rem;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .pub-docs__steps li {
      display: flex;
      gap: 0.85rem;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .pub-docs__step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--pub-accent), var(--pub-accent2));
      color: #fff;
      font-weight: 800;
      font-size: 0.85rem;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .pub-docs__steps strong { display: block; margin-bottom: 0.25rem; font-size: 0.9rem; }
    .pub-docs__steps p { margin: 0; font-size: 0.85rem; color: var(--pub-muted); line-height: 1.55; }

    .pub-docs__callout {
      margin: 1.25rem 0;
      padding: 1rem 1.1rem;
      border-radius: 12px;
      border-left: 4px solid;
      font-size: 0.88rem;
      line-height: 1.6;
    }
    .pub-docs__callout strong {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .pub-docs__callout p { margin: 0; }
    .pub-docs__callout--info { background: #f0f9ff; border-color: #0284c7; color: #0c4a6e; }
    .pub-docs__callout--tip { background: #f0fdf4; border-color: #16a34a; color: #14532d; }
    .pub-docs__callout--warning { background: #fffbeb; border-color: #d97706; color: #78350f; }
    .pub-docs__callout--success { background: #ecfdf5; border-color: #059669; color: #064e3b; }

    .pub-docs__table-wrap {
      overflow-x: auto;
      margin: 1rem 0 1.25rem;
      -webkit-overflow-scrolling: touch;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .pub-docs__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      min-width: 320px;
    }
    .pub-docs__table th {
      text-align: left;
      padding: 0.65rem 0.85rem;
      background: #f8fafc;
      font-weight: 700;
      color: var(--pub-dark);
      border-bottom: 1px solid #e2e8f0;
    }
    .pub-docs__table td {
      padding: 0.6rem 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
      vertical-align: top;
      line-height: 1.45;
    }
    .pub-docs__table tr:last-child td { border-bottom: none; }

    .pub-docs__related { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
    .pub-docs__related-grid {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .pub-docs__related-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      text-align: left;
      padding: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .pub-docs__related-card:hover {
      border-color: #bae6fd;
      box-shadow: 0 8px 24px rgba(2, 132, 199, 0.1);
    }
    .pub-docs__related-card mat-icon { color: var(--pub-accent); }
    .pub-docs__related-card strong { font-size: 0.88rem; color: var(--pub-dark); }
    .pub-docs__related-card span { font-size: 0.78rem; color: var(--pub-muted); line-height: 1.45; }

    .pub-docs__nav-prev-next {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: 1fr 1fr;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .pub-docs__nav-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      text-align: left;
      padding: 0.85rem 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #fff;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .pub-docs__nav-card:hover { border-color: #bae6fd; }
    .pub-docs__nav-card span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pub-muted); font-weight: 700; }
    .pub-docs__nav-card strong { font-size: 0.88rem; color: var(--pub-dark); }
    .pub-docs__nav-card--next { align-items: flex-end; text-align: right; }

    .pub-docs__cta {
      margin-top: 2.5rem;
      padding: clamp(2rem, 4vw, 2.75rem);
      border-radius: 18px;
      background: linear-gradient(135deg, #0c4a6e 0%, #312e81 100%);
      color: #fff;
      text-align: center;
    }
    .pub-docs__cta h2 {
      margin: 0 0 0.5rem;
      font-size: clamp(1.25rem, 3vw, 1.55rem);
      font-weight: 800;
      color: #fff;
    }
    .pub-docs__cta p {
      margin: 0 auto 1.25rem;
      max-width: 520px;
      opacity: 0.9;
      line-height: 1.55;
      font-size: 0.92rem;
    }
    .pub-docs__cta .pub-actions { justify-content: center; }
    .pub-docs__cta .pub-btn--outline {
      background: transparent;
      color: #fff;
      border-color: rgba(255, 255, 255, 0.35);
    }

    @media (min-width: 1200px) {
      .pub-docs__layout {
        grid-template-columns: 280px minmax(0, 1fr) 200px;
      }
      .pub-docs__toc-rail { display: block; }
    }

    @media (max-width: 1023px) {
      .pub-docs__nav-toggle { display: inline-flex; }
      .pub-docs__sidebar {
        display: none;
        position: fixed;
        inset: 0;
        top: 64px;
        z-index: 40;
        max-height: none;
        border-radius: 0;
        padding: 1rem;
        overflow-y: auto;
      }
      .pub-docs__layout--nav-open .pub-docs__sidebar { display: block; }
      .pub-docs__toc-inline { display: block; }
    }

    @media (max-width: 767px) {
      .pub-docs__article-head { flex-direction: column; }
      .pub-docs__nav-prev-next { grid-template-columns: 1fr; }
      .pub-docs__nav-card--next { align-items: flex-start; text-align: left; }
      .pub-docs__cta .pub-actions { flex-direction: column; align-items: stretch; }
      .pub-docs__cta .pub-btn { width: 100%; min-height: 44px; }
    }
  `,
  ],
})
export class DocsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)

  readonly DOC_CATEGORIES = DOC_CATEGORIES
  readonly contactEmail = SPENDLYX_CONTACT_EMAIL
  readonly getDocById = getDocById

  query = ''
  readonly activeId = signal('intro')
  readonly navOpen = signal(false)
  readonly expandedCats = signal(new Set(DOC_CATEGORIES.map((c) => c.id)))
  readonly activeAnchor = signal('')
  readonly searchResults = signal<DocArticle[]>(DOC_ARTICLES)

  readonly quickChips = [
    { id: 'integrations', label: 'Conectar AWS' },
    { id: 'billing', label: 'Facturación' },
    { id: 'repos-github', label: 'GitHub' },
    { id: 'command-center', label: 'Centro de mando' },
    { id: 'faq', label: 'FAQ' },
  ]

  readonly current = computed(() => getDocById(this.activeId()) ?? DOC_ARTICLES[0])

  readonly filteredCount = computed(() => this.searchResults().length)

  readonly visibleCategories = computed(() => {
    const ids = new Set(this.searchResults().map((a) => a.categoryId))
    return DOC_CATEGORIES.filter((c) => ids.has(c.id))
  })

  readonly orderedVisibleArticles = computed(() => {
    const resultIds = new Set(this.searchResults().map((a) => a.id))
    return DOC_ARTICLES.filter((a) => resultIds.has(a.id))
  })

  readonly prevDoc = computed(() => {
    const list = this.orderedVisibleArticles()
    const idx = list.findIndex((a) => a.id === this.activeId())
    return idx > 0 ? list[idx - 1] : null
  })

  readonly nextDoc = computed(() => {
    const list = this.orderedVisibleArticles()
    const idx = list.findIndex((a) => a.id === this.activeId())
    return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null
  })

  ngOnInit(): void {
    const s = this.route.snapshot.data['seo']
    if (s) this.seo.apply(s)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.expandedCats.set(new Set([DOC_CATEGORIES[0].id]))
    }
  }

  isMobile = (): boolean => typeof window !== 'undefined' && window.innerWidth < 1024

  handleSearchChange = (): void => {
    this.searchResults.set(searchDocs(this.query))
    const first = this.searchResults()[0]
    if (first && !this.searchResults().some((a) => a.id === this.activeId())) {
      this.activeId.set(first.id)
    }
    if (this.query.trim()) {
      this.expandedCats.set(new Set(this.visibleCategories().map((c) => c.id)))
    }
  }

  clearSearch = (): void => {
    this.query = ''
    this.searchResults.set(DOC_ARTICLES)
  }

  openArticle = (id: string): void => {
    this.activeId.set(id)
    this.navOpen.set(false)
    this.activeAnchor.set('')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  toggleCategory = (id: string): void => {
    const next = new Set(this.expandedCats())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.expandedCats.set(next)
  }

  articlesForCategory = (categoryId: string): DocArticle[] =>
    this.searchResults().filter((a) => a.categoryId === categoryId)

  categoryTitle = (categoryId: string): string =>
    DOC_CATEGORIES.find((c) => c.id === categoryId)?.title ?? categoryId

  toc = (doc: DocArticle): { anchor: string; text: string }[] =>
    doc.blocks
      .filter((b): b is Extract<DocBlock, { type: 'heading' }> => b.type === 'heading' && b.level === 2)
      .map((b) => ({ anchor: b.anchor, text: b.text }))

  handleTocClick = (event: Event, anchor: string): void => {
    event.preventDefault()
    this.activeAnchor.set(anchor)
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
