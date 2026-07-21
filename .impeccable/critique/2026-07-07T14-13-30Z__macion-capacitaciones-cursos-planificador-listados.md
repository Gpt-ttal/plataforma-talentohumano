---
target: apps/web/src/pages/{capacitaciones,cursos,planificador} (seccion Formacion)
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-07-07T14-13-30Z
slug: macion-capacitaciones-cursos-planificador-listados
---
## Design Health Score
Total: 26/40 (Aceptable). Heuristics 1:3 2:2 3:3 4:4 5:3 6:2 7:2 8:2 9:3 10:2.

## Anti-Patterns Verdict
No AI-slop clasico del Sello (bans respetados). Slop sutil: "genericidad por plantilla" -
CapacitacionesPage/CursosPage/PlanificadorPage comparten estructura identica (form "Nuevo X",
filtros, fila con monograma de 2 letras + titulo + pill). Deterministic scan: 0 findings
(detect.mjs no cubre "sameness" holistico, solo anti-patrones CSS puntuales).

## Priority Issues
[P1] Cero identidad visual por dominio - badge de 2 letras en vez de iconos calendar/book/grad-cap
     ya existentes en dash/Icon.tsx. Fix: /impeccable delight
[P1] Dato "hero" de cada modulo oculto (progreso de cursos, fecha de eventos, trimestre de
     planificacion) - exige clic extra. Fix: /impeccable layout
[P2] Filtros hechos a mano en vez de ChipFiltro compartido (rounded-full vs rounded-md del
     resto del sistema). Fix: /impeccable polish
[P2] Interaccion inconsistente: Cursos navega (Link), Eventos/Planificador expanden (acordeon),
     visualmente indistinguibles. Fix: /impeccable clarify
[P3] Formulario "Nuevo X" siempre abierto, no colapsable. Fix: /impeccable layout

## Persona Red Flags
Alex (TH power user): no puede escanear por tipo, progreso de curso a un clic de mas.
Sam (screen reader): badge de 2 letras sin aria-label, pierde significado.

## Minor Observations
Monograma fragil si el label es una sola palabra. FiltroEstado/FiltroAmbito duplicados letra
por letra entre CapacitacionesPage y CursosPage (comentario propio lo admite).
