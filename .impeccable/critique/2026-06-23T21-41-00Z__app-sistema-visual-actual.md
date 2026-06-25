---
target: app (sistema visual actual)
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-06-23T21-41-00Z
slug: app-sistema-visual-actual
---
# Critique — Sistema visual actual (dashboard + funcionarios + shell)

Target: dashboard (`app/page.tsx`), catálogo (`app/funcionarios/page.tsx`), shell (`app/layout.tsx`) + componentes.
Fecha: 2026-06-23 (re-run tras P1 bans/Sello/contraste/harden + P2 layout) · Register: product · WCAG objetivo: 2.1 AA.

## Design Health Score

| # | Heurística | Score | Δ | Issue clave |
|---|-----------|-------|---|-------------|
| 1 | Visibilidad del estado | 3 | = | Estados activos claros; el pipeline de flujo añade lectura del trámite de un vistazo; falta skeleton en lista paginada |
| 2 | Sistema ↔ mundo real | 4 | = | Lenguaje de dominio correcto; el flujo Pendiente→…→Paz y salvo refleja el proceso real |
| 3 | Control y libertad | 3 | +1 | Confirmación inline en transiciones irreversibles (harden); aún sin deshacer tras commit ni Esc documentado en modal |
| 4 | Consistencia y estándares | 4 | +1 | Un solo lenguaje de card (hairline); semáforo único reusado en el pipeline; oro reservado al hito |
| 5 | Prevención de errores | 3 | +1 | "Generar liquidación" / "Registrar paz y salvo" ahora piden confirmación antes de disparar |
| 6 | Reconocer vs recordar | 3 | = | Filtros y pills visibles con texto; etapas accionables enlazan a la vista del rol |
| 7 | Flexibilidad y eficiencia | 2 | = | Sin atajos de teclado ni acciones masivas (TH procesa de a uno) |
| 8 | Estético y minimalista | 3 | +1 | Bans fuera (eyebrows, foil, filetes, gradientes); hero-metric → pipeline honesto; resta veladura de fondo |
| 9 | Recuperación de errores | 2 | = | Errores inline pero genéricos ("No se pudo…") |
| 10 | Ayuda y documentación | 1 | = | Cero ayuda contextual; empty states no enseñan |
| **Total** | | **28/40** | **+4** | **Good** — base sólida; el grueso de la piel ya está en dirección "C" |

## Anti-Patterns Verdict

**¿Parece hecho por IA / plantilla?** No. Las bases nunca lo parecieron (componentes propios, dominio real, máquina de estados en servidor), y la piel ya salió de los tells de plantilla 2023 que el baseline marcó.

**LLM assessment:** los cinco P1 del baseline están resueltos en código:
- **Eyebrows en mayúsculas tracked** sobre cada sección → eliminados (subtítulo de marca conservado una sola vez en el shell).
- **Filete lateral de color** en `StatCard` → el componente entero desapareció; la nueva pieza no usa bordes laterales de color.
- **Texto en gradiente** (`.text-gold-foil`) → eliminado de `globals.css`.
- **Plantilla hero-metric** (5 StatCards idénticas) → reemplazada por un **panel único "Flujo del trámite"**: pipeline de 4 etapas (las cuatro fases de la máquina de estados) con conectores; el total baja a contexto; el cierre lleva el **sello** (punto verde con anillo de oro) — el oro aparece una sola vez.
- **Regla del Sello rota** → restaurada: el oro vive solo en el sello del cierre y en la acción principal; ≤10% de la pantalla.

**Deterministic scan:** `detect.mjs --json` sobre `app/page.tsx`, `app/layout.tsx`, `app/funcionarios/page.tsx` y `components/` → **`[]` (limpio), exit 0**. Ninguno de los tres bans deterministas reaparece. El advisory previo de `#8c6b24` y radius `9px` también quedó saldado (el primero se fue con `.text-gold-foil`; el scrollbar usa `9999px`).

**Visual overlays:** no disponibles. La superficie (`/`) está tras login SUPERADMIN (Supabase) y esta sesión no tiene automatización de navegador que autentique. Señal de fallback declarada: el juicio se apoya en el detector determinista (limpio) + revisión de fuente.

## Overall Impression

El esqueleto fuerte sigue intacto y ahora la piel está alineada con la dirección "C". La jugada de este run —convertir las 5 métricas idénticas en un **flujo honesto** donde el ojo viaja hasta el sello del cierre— resuelve dos bans (hero-metric + identical card grids) y, de paso, unifica los dos lenguajes de card y reusa el semáforo único. El puntaje sube de 24 ("Aceptable") a 28 ("Good"). La mayor oportunidad restante ya no es la piel: es **ayuda/onboarding** (heurística 10 = 1) y la **eficiencia del power user** (TH de a uno, sin atajos).

## What's Working

- **Pipeline de flujo (nuevo):** un único objeto que cuenta la historia del trámite y aterriza en el sello del cierre. Jerarquía real (squint test), sin cards idénticas, con el oro como acento de hito.
- **Semáforo único** (`lib/ui.ts` + dots/pills): el pipeline lo reusa en vez de reconstruir color a mano. Consistencia por construcción.
- **Confirmación inline** en transiciones irreversibles: previene el avance accidental del estado sin recurrir a un modal.

## Priority Issues

- **[P1] Ayuda y onboarding casi ausentes.** Heurística 10 = 1. Un usuario de área nuevo cae en `/mi-area` sin nada que le enseñe los estados ni qué se espera de él; los empty states dicen "nada aquí" en vez de enseñar. *Por qué importa:* es el techo más bajo del tablero y el que más frena a un primerizo. *Fix:* empty states que enseñan el siguiente paso + microcopy contextual en los estados. *Comando:* `/impeccable onboard`.
- **[P2] Mensajes de error genéricos.** "No se pudo…" sin diagnóstico ni siguiente paso (heurística 9 = 2). *Fix:* nombrar el problema y la acción de recuperación, cerca del origen. *Comando:* `/impeccable clarify`.
- **[P2] Sin eficiencia para el power user.** TH genera de a uno; sin selección múltiple ni atajos de teclado (heurística 7 = 2). *Fix:* acción masiva sobre "Listo para liquidar" + atajos. *Comando:* `/impeccable harden` (o un shape dedicado).
- **[P2] Falta feedback de carga en listas paginadas.** Sin skeleton al paginar/buscar (heurística 1). *Fix:* skeleton de filas, no spinner central. *Comando:* `/impeccable polish`.

## Persona Red Flags

**Alex (power user — panel/admin):** sigue sin selección múltiple ni atajos; el detalle no documenta cierre con Esc. El pipeline ahora le da un mapa del estado global de un vistazo (mejora).

**Sam (a11y / lector de pantalla):** el pipeline es un `<ol>` de etapas (orden semántico), el color de estado no va solo en color (punto + etiqueta), foco oro visible. Revisar que los conectores `aria-hidden` no rompan el conteo de la lista y el contraste de `gold-200/80` sobre navy en el header.

**Jordan (primera vez — usuario de área):** sigue sin ayuda contextual ni onboarding; es el red flag dominante y el objetivo natural del siguiente paso.

## Minor Observations

- Veladura radial cálida del `body` (`globals.css`): decorativa y casi imperceptible, pero es lo único que aún empuja contra "minimalismo perfecto" en la heurística 8.
- Las etapas-enlace (Listo/Liquidación) revelan "Ver →" en hover; las no-enlace no, lo que deja alturas levemente distintas en la fila. Cosmético.
- El re-score cubre el mismo scope del baseline (dashboard + shell + funcionarios); las vistas por rol nuevas (`/mi-area`, `/usuarios`) aún no se han critiqueado a fondo.

## Questions to Consider

- ¿Y si el primer paso de un usuario de área nuevo lo enseñara la propia pantalla, en vez de asumir que ya sabe qué es un "visto bueno"?
- ¿Merece "Listo para liquidar" una acción masiva, dado que es el único punto donde TH hace trabajo repetitivo?
- ¿El sello del cierre se siente lo bastante como un hito, o pide un instante de motion cuando un funcionario llega a paz y salvo?
