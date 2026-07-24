# AGENTS.md — Instrucciones para agentes de IA (CODEX y compatibles)

> Este archivo es el punto de entrada para **CODEX** (y cualquier agente que lea `AGENTS.md` por
> convención). Su contraparte para Claude Code es [`CLAUDE.md`](CLAUDE.md). **Ambos apuntan al mismo
> cerebro** y a las mismas reglas: no son dos fuentes de verdad distintas, son dos puertas a la misma.

---

## 1. Lee esto primero, en este orden

1. [`CLAUDE.md`](CLAUDE.md) — cerebro del repositorio: identidad, misión, reglas de trabajo, estado
   actual. **Es la fuente única de verdad.** Todo lo demás cuelga de ahí.
2. [`docs/historico/BITACORA-IA.md`](docs/historico/BITACORA-IA.md) — **bitácora compartida Claude ↔
   CODEX**. Léela SIEMPRE al arrancar: te dice qué tocó el otro agente por última vez, en qué archivos,
   y si dejó algo a medias. Escríbela SIEMPRE al terminar (ver §3).
3. [`README.md`](README.md) — quickstart, comandos, mapa de "dónde vive cada cosa".
4. [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) + [`docs/architecture/adr/`](docs/architecture/adr/)
   — el qué y el por qué de la arquitectura.
5. [`docs/domain/DOMINIO.md`](docs/domain/DOMINIO.md) y [`docs/data/DICCIONARIO-DATOS.md`](docs/data/DICCIONARIO-DATOS.md)
   — dominio y esquema real de la BD.
6. [`docs/GUIA-DOCUMENTACION.md`](docs/GUIA-DOCUMENTACION.md) — **léela al CERRAR tu sesión**: es la
   matriz que dice exactamente qué documento actualizar (y qué no tocar/duplicar) según lo que hiciste.
   Aplica igual para CODEX que para Claude — es la misma disciplina anti-deriva para ambos.

---

## 2. Reglas de trabajo (idénticas a las de Claude — no las relajes)

- **NUNCA commitear ni hacer push sin que el usuario (Leonardo) lo pida explícitamente.** Constraint
  duro. El working tree acumula cambios sin commitear; el humano commitea cuando quiere.
- **NUNCA aplicar migraciones a la BD de producción sin autorización explícita, por-migración**
  (nombrando el archivo exacto). Supabase project ref y detalle en `CLAUDE.md` § Infraestructura.
- **Toda comunicación en español** (es-CO). Si un sub-proceso produce salida en inglés, tradúcela.
- **`shared/src/estado.ts` no se toca sin TDD previo** (máquina de estados verificada, ver ADR-0005).
- **Buildear `shared` antes** de que backend/web vean cambios de dominio (`npm run build --workspace=shared`).
- **Gate de cierre**: `build shared` → tests de los 3 workspaces → `tsc --noEmit` backend y web →
  `npm run build` raíz, todo en verde antes de dar una tarea por completa.
- **Política de tests lean**: consolidar tests nuevos en archivos existentes en vez de uno por caso;
  no testear plomería/presentacional.
- **Sistema visual "El Sello"**: respetar las reglas irrompibles y bans de `CLAUDE.md` § Sistema Visual
  y `DESIGN.md`. Color de estado solo desde `shared/src/ui.ts` (Semáforo Único).

---

## 3. Mecanismo de cooperación Claude ↔ CODEX

El objetivo: que **Leonardo trabaje con cualquiera de los dos agentes sin perder contexto**, y que
cada agente sepa qué hizo el otro. La coordinación es **asíncrona y basada en archivos** (ninguno de
los dos ve la sesión del otro en vivo).

### Contrato

1. **Al arrancar una sesión**: lee [`docs/historico/BITACORA-IA.md`](docs/historico/BITACORA-IA.md)
   (las últimas entradas). Si el otro agente dejó algo `EN PROGRESO` o `PENDIENTE`, tenlo en cuenta
   antes de tocar los mismos archivos.
2. **Al terminar una sesión (o un bloque significativo)**: **agrega una entrada** al tope de la
   bitácora con el formato de abajo. No edites entradas ajenas; es append-only (lo más reciente arriba).
3. **Quién escribe dónde**:
   - **CODEX** y **Claude** escriben ambos en `BITACORA-IA.md` (bitácora cruzada, corta).
   - **Claude** además mantiene `CLAUDE.md` § Log de Sesiones (histórico detallado) y su memoria
     persistente. CODEX **no** edita el Log de Sesiones de Claude; si hizo algo relevante para el
     estado del proyecto, lo resume en la bitácora y menciona qué archivos tocó, y Claude lo
     incorpora al Log en su próximo cierre.
4. **Handoff explícito**: si dejas trabajo a medias para que lo siga el otro agente, márcalo
   `PENDIENTE → (otro agente)` y sé concreto sobre el próximo paso y los archivos.
5. **Nunca dupliques la fuente de verdad**: si un dato de arquitectura/dominio cambió, actualiza el
   `docs/` correspondiente y **referencia**, no lo copies dentro de la bitácora.

### Formato de entrada de la bitácora

```markdown
## AAAA-MM-DD — [CLAUDE | CODEX] — <título corto>

- **Hice:** <qué se hizo, 1-4 viñetas>
- **Archivos:** <rutas tocadas; "ninguno (solo diseño)" si aplica>
- **Estado:** <COMPLETO | EN PROGRESO | PENDIENTE → (otro agente)>
- **Verificación:** <tests/build corridos y su resultado, o "N/A (docs)">
- **Para el otro agente:** <qué necesita saber Claude/CODEX; próximo paso concreto>
```

---

## 4. Comandos esenciales

```bash
npm run build --workspace=shared          # SIEMPRE primero
npm run dev                               # backend :3000 + frontend :5173
npm run test --workspace=shared           # y apps/backend, apps/web
npx tsc --noEmit --project apps/backend    # typecheck backend (no tiene script propio)
npm run build                             # producción: shared → backend → web
```

Detalle completo en [`README.md`](README.md) y [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).
