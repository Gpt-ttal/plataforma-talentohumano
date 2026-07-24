# Guía de mantenimiento de la documentación

> **Para Claude y CODEX.** Enseña **qué documento tocar y qué limpiar** según lo que hizo la sesión.
> Léela al **cerrar** una sesión (o un bloque significativo). El objetivo: mantener la documentación
> viva sincronizada con el código y **sin la deriva/duplicación** que motivó esta reestructuración
> (2026-07-21).

---

## 1. Principio rector: una fuente de verdad por tema

Cada hecho vive en **un solo** lugar. Los demás documentos **enlazan**, no copian.

| Tema | Fuente única | Los demás… |
|---|---|---|
| Esquema real de la BD | `apps/backend/src/infrastructure/db/schema.ts` | `docs/data/DICCIONARIO-DATOS.md` lo refleja 1:1 |
| Tipos de dominio | `shared/src/domain.ts` | `docs/domain/DOMINIO.md` lo resume |
| Reglas de estado | `shared/src/estado.ts` | DOMINIO / ADR-0005 lo describen |
| **Qué es verdad hoy** por feature | `docs/historico/PROGRESO.md` | CLAUDE.md §9 lo resume en 3 líneas |
| **Cómo se llegó ahí** (narrativa) | `docs/historico/LOG-DE-SESIONES.md` | nadie más lo narra |
| Por qué de una decisión | `docs/architecture/adr/NNNN-*.md` | ARCHITECTURE / CLAUDE.md enlazan |

**Regla anti-deriva #1:** si vas a escribir el mismo hecho en dos archivos, **detente** — uno debe
enlazar al otro. La duplicación que había entre "Progreso" y "Log de Sesiones" (mismo plan narrado
dos veces) es exactamente lo que NO se repite.

**Regla anti-deriva #2:** `PROGRESO.md` describe el **estado** (presente), `LOG-DE-SESIONES.md`
narra el **proceso** (pasado). Si te encuentras contando *cómo* lo hiciste en PROGRESO, va al LOG.

---

## 2. Matriz de cierre: "¿qué cambió en mi sesión?" → qué toco

Recorre la tabla de arriba abajo; aplica cada fila cuyo disparador ocurrió. Casi siempre tocarás
**LOG + BITÁCORA** (filas 1-2) y, según el caso, alguna más.

| Si en la sesión… | ACTUALIZA | LIMPIA / cuidado |
|---|---|---|
| **1. Hiciste cualquier trabajo real** | Agrega entrada al final de `docs/historico/LOG-DE-SESIONES.md` | No reescribas entradas viejas (append-only). No copies el detalle del plan; resume + referencia el archivo del plan |
| **2. Trabajaste (siempre, para que CODEX lo sepa)** | Agrega entrada corta a `docs/historico/BITACORA-IA.md` (tope) | No edites entradas ajenas. No dupliques `docs/`: referencia |
| **3. Cambió el ESTADO de una feature** (se completó, se rompió, cambió su "pendiente") | Edita **solo el párrafo** de esa feature en `docs/historico/PROGRESO.md` + el resumen de 3 líneas de CLAUDE.md §9 | Borra la afirmación que quedó **falsa** (no la dejes junto a la nueva). Si un "pendiente" se resolvió, quítalo de la lista de pendientes vivos |
| **4. Cambió el esquema de la BD** (migración, tabla, columna, enum) | `docs/data/DICCIONARIO-DATOS.md` (reflejar 1:1 con `schema.ts`) + tabla de migraciones de CLAUDE.md §6 | Regenera la fila/enum completo, no parches sueltos. Verifica contra `schema.ts`, no de memoria |
| **5. Cambiaron tipos/reglas de dominio** (`domain.ts`, `estado.ts`, `permisos.ts`) | `docs/domain/DOMINIO.md` | Que el resumen no contradiga el código nuevo |
| **6. Tomaste una decisión de arquitectura nueva** | Agrega `docs/architecture/adr/NNNN-*.md` (siguiente número) + fila en `adr/README.md` | **No edites** ADRs existentes salvo marcar `Status: Deprecated`/`Superseded by ADR-NNNN`. Nunca borres un ADR |
| **7. Cambió stack, comando, patrón o mapa de archivos** | `docs/architecture/ARCHITECTURE.md` (+ `README.md` si es un comando de arranque) | Que `README.md` y ARCHITECTURE no discrepen en los comandos |
| **8. El usuario dio feedback o hay una decisión de proceso** | Memoria persistente (`~/.claude/.../memory/`) + `MEMORY.md` | Si un feedback reemplaza a otro, **edita** el archivo existente, no crees un duplicado |
| **9. Cambió misión, marca, roles de alto nivel, o reglas visuales** | `CLAUDE.md` (§1/§2/§5) y/o `PRODUCT.md`/`DESIGN.md` | Solo lo estable; nada de estado de sesión en CLAUDE.md |

**Regla anti-deriva #3 (la más importante para CLAUDE.md):** `CLAUDE.md` es **índice + reglas
estables + punteros**. **Nunca** dejes que vuelva a crecer con narrativa de sesión. Si tu edición a
CLAUDE.md es un párrafo contando qué hiciste, va al LOG, no aquí.

---

## 3. Qué NO tocar al cerrar (para no re-inflar el cerebro)

- **CLAUDE.md** no recibe entradas de sesión, ni tablas de progreso detalladas, ni narrativa. Solo
  cambia si cambió algo **estable** (una regla, una decisión de alto nivel, el mapa documental).
- **ADRs** no se reescriben con "actualizaciones"; una decisión que cambia genera un ADR **nuevo** que
  supersede al viejo (y el viejo se marca, no se borra).
- **LOG-DE-SESIONES.md** no se edita hacia atrás; solo se agrega al final.

---

## 4. Checklist de cierre (orden recomendado)

En un solo batch al final de la sesión (ver la memoria de proceso `feedback-memoria-solo-al-cierre`):

1. ¿Gates en verde? `build shared` → tests ×3 → `tsc --noEmit` backend/web → `npm run build` raíz.
2. Recorre la **matriz §2** y aplica cada fila disparada.
3. Aplica las **reglas anti-deriva** (§1, §3): ¿duplicaste algo? ¿dejaste una afirmación falsa? ¿metiste
   narrativa en CLAUDE.md o en PROGRESO?
4. Actualiza memoria si hubo feedback/decisión nueva.
5. Deja constancia en `BITACORA-IA.md` (siempre) y ofrece commit (sin hacerlo salvo que lo pidan).

---

## 5. Chequeo de salud (opcional, rápido)

Para detectar deriva antes de que se acumule:

```bash
# Duplicación de planes/narrativa que debería vivir solo en el LOG:
#   (esperado: 0 en CLAUDE.md)
grep -rc "<nombre-de-plan>" CLAUDE.md docs/

# Tamaño de CLAUDE.md — si supera ~250 líneas, probablemente se coló narrativa:
wc -l CLAUDE.md

# El diccionario contra el esquema real:
#   revisar que cada tabla/enum de schema.ts esté en DICCIONARIO-DATOS.md
```

La skill `doc-drift-detector` (`link_checker.py`, `doc_staleness_scorer.py`) puede automatizar el
chequeo de enlaces rotos y frescura si se quiere gate en CI.
