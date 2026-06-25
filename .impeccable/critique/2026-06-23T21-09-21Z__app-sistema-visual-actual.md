---
target: app (sistema visual actual)
total_score: 24
p0_count: 0
p1_count: 5
timestamp: 2026-06-23T21-09-21Z
slug: app-sistema-visual-actual
---
# Critique — Sistema visual actual (dashboard + funcionarios + shell)

Target: dashboard (`app/page.tsx`), catálogo (`app/funcionarios/page.tsx`), shell (`app/layout.tsx`) + componentes.
Fecha: 2026-06-23 · Register: product · WCAG objetivo: 2.1 AA.

## Design Health Score

| # | Heurística | Score | Issue clave |
|---|-----------|-------|-------------|
| 1 | Visibilidad del estado | 3 | Estados activos claros (nav/segmented/chip); falta skeleton en lista paginada |
| 2 | Sistema ↔ mundo real | 4 | Lenguaje de dominio correcto (paz y salvo, liquidación, roles) |
| 3 | Control y libertad | 2 | Acciones de estado irreversibles sin deshacer ni confirmación |
| 4 | Consistencia y estándares | 3 | Dos tratamientos de "card" distintos; oro usado contra su propia regla |
| 5 | Prevención de errores | 2 | "Generar liquidación" / "Registrar paz y salvo" disparan sin confirmar |
| 6 | Reconocer vs recordar | 3 | Filtros y pills visibles con texto; bien |
| 7 | Flexibilidad y eficiencia | 2 | Sin atajos de teclado ni acciones masivas (TH procesa de a uno) |
| 8 | Estético y minimalista | 2 | Sobrecarga de oro: eyebrows, foil, filetes laterales, gradientes |
| 9 | Recuperación de errores | 2 | Errores inline pero genéricos ("No se pudo…") |
| 10 | Ayuda y documentación | 1 | Cero ayuda contextual; empty states no enseñan |
| **Total** | | **24/40** | **Aceptable** — bases sólidas, faltan ajustes antes de gustar |

## Anti-Patterns Verdict

**¿Parece hecho por IA / plantilla?** Las *bases* no (componentes propios, dominio real, sistema de estados serio). Pero la **piel "delux" actual cae en varios tells de plantilla 2023** que además contradicen el DESIGN.md que acabamos de fijar:

- **Eyebrow en cada encabezado** (ban absoluto): `text-[11px] uppercase tracking-luxe text-gold-600` sobre "Panel de control", "Directorio", "Bandeja de rol". Kicker en mayúsculas tracked = gramática de IA, y encima en oro.
- **Filete lateral de color** (ban absoluto): `StatCard` lleva `<span absolute left-0 w-1 ${barra}>` — barra de 4px de color a la izquierda de la tarjeta. Reescribir con borde completo / número líder.
- **Texto en gradiente** (ban absoluto + detector): `.text-gold-foil` (`background-clip:text` + gradiente) en las cifras del dashboard. Detector lo marcó en `globals.css:89`.
- **Plantilla hero-metric**: 5 StatCards idénticas número-grande/label-chico. Cliché de SaaS.
- **Regla del Sello rota**: el oro está en eyebrows, números foil, filetes, gradientes de bandeja, filete superior, reglas divisorias y anillos. Muy por encima del ≤10%. El oro deja de significar "hito" porque está en todas partes.

**Detector determinista:** `gradient-text` (warning, `globals.css:89`); advisories: color `#8c6b24` fuera de paleta (`:88`) y radius `9px` fuera de escala (`:120`, el scrollbar).

## Overall Impression

Tienes un esqueleto de producto fuerte —componentes reutilizables, semáforo de estado centralizado, máquina de estados en servidor— vestido con una piel que grita oro. La mayor oportunidad de una sola jugada: **bajar el oro al hito** (Regla del Sello) y quitar los tres bans absolutos. Eso solo ya alinea la piel con la dirección "C" y sube varios puntos.

## What's Working

- **Semáforo único** (`lib/ui.ts` + `EstadoPill`): punto + etiqueta, fuente única de color de estado. Excelente base de consistencia y a11y.
- **Filas-acordeón** sobre tablas: progresiva, server-driven, con disparador accesible (`aria-expanded`, acciones fuera del disparador).
- **Lenguaje de dominio**: la copy habla el idioma del trámite (roles, estados, fechas) sin jerga técnica.

## Priority Issues

- **[P1] Sobrecarga de oro (rompe la Regla del Sello).** El oro aparece en eyebrows, cifras foil, filetes, gradientes y anillos. *Por qué importa:* cuando todo es dorado, el hito (paz y salvo, acción principal) deja de destacar; es la causa raíz del aire "delux recargado". *Fix:* eyebrows a plata/navy o eliminarlos; cifras foil → navy sólido; reservar oro al botón-sello y al estado de cierre. *Comando:* `/impeccable quieter`.
- **[P1] Contraste de texto secundario bajo el AA.** `silver-400` (#AEB6C6) sobre blanco ≈ 2.3:1 y `silver-500` (#8B93A6) ≈ 3.4:1, usados en metadatos ("CC documento · retiro", descripciones). *Por qué importa:* falla WCAG 2.1 AA (objetivo declarado) y es literalmente el "gris claro sobre casi-blanco" más difícil de leer. *Fix:* subir el texto secundario hacia ink/slate (≥4.5:1). *Comando:* `/impeccable colorize` (o `polish`).
- **[P1] Filete lateral de color en StatCard (ban absoluto).** *Fix:* borde hairline completo + número líder o pill; sin barra de color a la izquierda. *Comando:* `/impeccable polish`.
- **[P1] Eyebrow en cada encabezado (ban absoluto).** *Fix:* eliminar el kicker o sustituirlo por una cadencia de marca deliberada (una sola, no en cada pantalla). *Comando:* `/impeccable typeset`.
- **[P1] Acciones irreversibles sin confirmación.** "Generar liquidación" y "Registrar paz y salvo" cambian el estado global de inmediato. *Por qué importa:* un clic accidental avanza el trámite sin vuelta atrás; el servidor valida la transición, no la intención. *Fix:* paso de confirmación para transiciones irreversibles. *Comando:* `/impeccable harden`.
- **[P2] Plantilla hero-metric (5 StatCards idénticas).** *Fix:* jerarquizar (la cifra que importa manda), agrupar, o convertirlas en filtros con más oficio. *Comando:* `/impeccable layout`.

## Persona Red Flags

**Alex (power user — panel/admin):** TH genera liquidaciones de a una; no hay selección múltiple ni acción masiva. Sin atajos de teclado. El modal de detalle no documenta cierre con Esc.

**Sam (a11y / lector de pantalla):** metadatos en `silver-400/500` fallan contraste AA. El foco oro sí es visible (bien) y los pills no dependen solo de color (bien). Revisar `gold-200/80` sobre navy en el header (texto pequeño, contraste límite).

**Jordan (primera vez — usuario de área):** sin ayuda contextual ni onboarding; un usuario de área nuevo cae en `/mi-area` sin nada que le enseñe qué significan los estados o qué se espera de él.

## Minor Observations

- Radius `9px` del scrollbar fuera de la escala (cosmético; documentarlo o ajustarlo a 8px).
- `#8c6b24` (extremo del gradiente foil) desaparecerá al quitar `.text-gold-foil`.
- Dos lenguajes de "card": StatCard (con filete) vs FilaDesplegable/secciones (hairline). Unificar al hairline.

## Questions to Consider

- ¿Qué se vería si el oro apareciera **una sola vez** por pantalla — en el hito?
- ¿Las 5 métricas necesitan el mismo peso, o hay una que el superadmin mira primero?
- ¿"Generar liquidación" merece la misma ligereza de clic que abrir una fila?
