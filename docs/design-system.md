# Design System — CloudOps Control Center

Guía visual para la fase de pulido (Fase 29). Objetivo: interfaz moderna, viva y **sin bordes duros**.

## Principios

1. **Borderless** — No usar bordes visibles en cards, tablas, paneles ni inputs.
2. **Elevación suave** — Separar superficies con `box-shadow` y espaciado.
3. **Colores vivos** — Acentos por proveedor/módulo; gráficos con paleta `--chart-vivid-*`.
4. **Estados completos** — Loading, empty, error, success en cada pantalla.
5. **Acciones siempre activas** — Botones con acción real o simulada (toast, modal, refresh).

## Tokens CSS (`styles.scss`)

| Token | Uso |
|-------|-----|
| `--app-bg` / `--app-surface` | Fondo general |
| `--app-card` / `--app-elevated` | Cards y paneles |
| `--app-border` | Siempre `transparent` (light y dark) |
| `--app-shadow-xs` … `--app-shadow-lg` | Elevación |
| `--app-radius-sm` … `--app-radius-xl` | Border radius |
| `--chart-vivid-1` … `5` | Series de gráficos |
| `--sidebar-*` | Sidebar y topbar |

## Componentes base

| Componente | Ubicación |
|------------|-----------|
| `PageHeaderComponent` | Header con icono, descripción y acciones |
| `SummaryCardComponent` / `StatCardComponent` | KPIs con hover |
| `ChartCardComponent` | Gráficos bar/line/donut con loading/empty |
| `LoadingStateComponent` | Spinner + mensaje |
| `EmptyStateComponent` | Sin datos |
| `ErrorStateComponent` | Error + retry |
| `StatusBadgeComponent` | Badges de estado |
| `PlatformModulePageComponent` | Shell reutilizable para módulos |

## Clases utilitarias globales

- `.page-container` — Padding y ancho máximo
- `.table-card` / `.premium-table` — Tablas sin bordes, hover por fila
- `.soft-tabs` — Tabs con indicador redondeado
- `.soft-panel` — Panel elevado sin borde
- `.hub-action-chip` — Acciones rápidas con hover lift
- `.info-banner` — Avisos informativos

## Material overrides

- Cards, dialogs, menus: `border: none`, sombra suave
- Form fields outline: fondo elevado, borde solo en focus
- Tablas: headers con tinte sutil, sin `border-bottom`

## Animaciones

- `fadeIn` — Entrada de páginas (0.35s)
- Hover en cards: `translateY(-2px)` + sombra mayor
- Botones: `.btn-hover-lift`

## Responsive

- Grids con `auto-fill, minmax(280px, 1fr)`
- Tablas con scroll horizontal (`.data-table-wrap`)
- Topbar pills ocultas en `<640px`

## Modo demo

Cuando la API falla o devuelve vacío, los servicios usan `core/demo/demo-fallback.data.ts` automáticamente.
