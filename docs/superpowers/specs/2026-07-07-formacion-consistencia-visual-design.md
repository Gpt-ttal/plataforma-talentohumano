# Spec — Sección Formación: consistencia visual pendiente (P2 de la crítica)

> Fecha: 2026-07-07 · Estado: **pendiente de implementar** · Continuación de la
> crítica `/impeccable critique` corrida esta sesión sobre
> `apps/web/src/pages/{capacitaciones,cursos,planificador}`.

## Contexto

El usuario reportó que las 3 páginas de la sección Formación (Eventos/Capacitaciones,
Cursos, Planificador) se sentían "genéricas, pobres, planas" — la misma plantilla con
el texto cambiado. Se corrió una crítica formal (`/impeccable critique`, snapshot en
`.impeccable/critique/2026-07-07T14-13-30Z__macion-capacitaciones-cursos-planificador-listados.md`,
score 26/40) que encontró 2 P1 y 2 P2. **Los 2 P1 ya se implementaron y verificaron
en esta misma sesión:**

- Ícono de dominio por fila (`calendar`/`book`/`grad-cap` de `dash/Icon.tsx`) en vez
  del monograma de 2 letras del ámbito.
- Dato "hero" visible sin entrar al detalle: bloque de fecha en Eventos, conteo real
  de inscritos en Cursos (`Curso.totalInscritos`, nuevo campo — query agrupada sin
  N+1 en `cursoRepository.listarCursos`), bloque mes/año + trimestre en Planificador.

Verificado verde tras esos cambios: shared 240/240 · backend 290+2 skip · web 10/10 ·
`npm run build` raíz exit 0 sin warnings. **Quedan los 2 P2, sin tocar.**

## Alcance de este spec: los 2 P2 pendientes

### P2-1 — Filtros hechos a mano en vez del `ChipFiltro` compartido

**Dónde:** `FiltroEstado`/`FiltroAmbito` están duplicados **letra por letra** en
`apps/web/src/pages/capacitaciones/CapacitacionesPage.tsx` y
`apps/web/src/pages/cursos/CursosPage.tsx` (el propio código lo admite: "mirror
exacto de CapacitacionesPage.tsx"), y una tercera variante equivalente vive en
`apps/web/src/pages/planificador/PlanificadorPage.tsx`. Los tres reimplementan un
botón `rounded-full` local en vez de usar `components/ui/ChipFiltro.tsx`, que ya
migró a `rounded-md` (8px) como el resto del sistema documentado en `DESIGN.md` §5
("Chips (filtro)").

**Por qué importa:** deriva visual real y silenciosa. Si `ChipFiltro` cambia de
estilo en el futuro (p. ej. otro ajuste de tokens), estas 3 páginas no lo heredan —
tienen que actualizarse a mano, y probablemente se olvide alguna.

**Diseño propuesto:**
1. `ChipFiltro` (`components/ui/ChipFiltro.tsx`) ya soporta `label`/`activo`/`href`/
   `contador` vía `Link`, server-driven. Los 3 filtros locales (`FiltroEstado`,
   `FiltroAmbito` ×2, y el filtro de mes/estado/ámbito de Planificador) construyen
   el `href` con `setSearchParams` en un `onClick` en vez de un `Link` directo —
   **decisión a tomar**: ¿migrar a `Link`+`hrefCon` (patrón ya usado en
   `CatalogoFuncionarios`/`ArchivoPage`) o extender `ChipFiltro` para aceptar un
   `onClick` además de `href`? Recomendado: `Link`+`hrefCon`, es el patrón dominante
   del resto del catálogo y evita introducir una segunda API en `ChipFiltro`.
2. Reemplazar los 3 bloques `FiltroEstado`/`FiltroAmbito` (y su gemelo en
   `PlanificadorPage.tsx`, líneas ~400-465) por composiciones de `<ChipFiltro>`.
3. Extraer un helper compartido si el patrón "chip de estado" + "chip de ámbito" se
   repite idéntico en las 3 páginas — evaluar en el momento; no forzar una
   abstracción si las opciones (`estados`/`ambitos`) difieren demasiado entre
   dominios.

**Riesgo:** bajo. Cambio presentacional puro, sin tocar hooks ni backend.

### P2-2 — Señal visual inconsistente: Cursos navega, Eventos/Planificador expanden

**Dónde:** `FilaCapacitacion` (`CapacitacionesPage.tsx`) y `Fila` de Planificador
(`PlanificadorPage.tsx`) usan `FilaDesplegable` — un acordeón que expande in-place.
`FilaCurso` (`CursosPage.tsx`) es un `<Link to={c.id}>` que navega a
`/cursos/:id` (página dedicada, decisión de la Fase 6 — ver
`.superpowers/sdd/progress.md`). Visualmente las 3 filas son casi indistinguibles
hasta el clic: incluso tras el fix de los P1 (ícono de dominio + dato hero), nada en
`FilaCurso` comunica "esto te va a sacar de esta pantalla" mientras que las otras
dos comunican "esto se abre aquí mismo" (el chevron rotable de `FilaDesplegable`).

**Por qué importa:** rompe "Recognition Rather Than Recall" (heurística #6 de
Nielsen) — mismo look, comportamiento distinto. Un usuario que aprendió el patrón
de acordeón en Eventos/Planificador puede sorprenderse al perder su lugar en la
lista de Cursos.

**Diseño propuesto:** añadir un indicador de navegación explícito al final de
`FilaCurso` (mismo lugar donde `FilaDesplegable` pinta su chevron rotable a la
izquierda) — un ícono `arrow` (ya existe en `dash/Icon.tsx`) a la derecha del pill
de estado, sutil (`text-silver-400`, tamaño `h-4 w-4`), que comunique "esto abre una
página" sin competir con el pill de estado ni el dato hero recién agregado.
Alternativa más simple: mantener el chevron pero rotado -90°/apuntando a la derecha
en vez de hacia abajo, para reusar el mismo lenguaje visual que el acordeón pero con
una dirección que lea "hacia adelante" en vez de "hacia abajo".

**Riesgo:** bajo. Un ícono adicional en una fila ya tocada esta sesión.

## Fuera de alcance (explícitamente, no tocar sin nueva conversación)

- No migrar `CursosPage` de página dedicada a modal/acordeón — esa decisión de
  arquitectura (Fase 6, Sesión 36) ya se tomó deliberadamente y no está en cuestión.
- No tocar `CursoDetallePage`, `GestionCapacitacion`, `CalendarioPlanificador` ni
  ningún flujo de mutación — el hallazgo P2 es puramente de la fila de listado.
- No introducir un nuevo endpoint ni tocar migraciones — ambos P2 son 100%
  frontend, sin cambios de backend.

## Verificación al cerrar

`npm run build --workspace=shared` → `npm run typecheck --workspace=apps/web` →
`npm run test --workspace=apps/web` (10/10, sin tests nuevos esperados — cambio
presentacional) → `npm run build` raíz (exit 0 sin warnings). Re-correr
`/impeccable critique` sobre el mismo target al cerrar para confirmar que el score
sube desde 26/40.
