# Spec: Plataforma Multi-Módulo + Concurrencia + Realtime

**Fecha:** 2026-06-30  
**Autor:** leonardoreales@americana.edu.co  
**Estado:** APROBADO  

---

## 1. Modelo de Plataforma

**Plataforma de Gestión de Talento Humano** — la app madre. Contiene módulos independientes. Un módulo es un subdominio con su propia URL base, icono, conjunto de roles con acceso, y estado de disponibilidad.

**Módulos actuales:**

| id | nombre | rutaBase | rolesQueVen | estado |
|----|--------|----------|-------------|--------|
| `paz-y-salvo` | Paz y Salvo | `/paz-y-salvo` | todos | `ACTIVO` |
| `capacitaciones` | Capacitaciones | `/capacitaciones` | SA, TH, SST | `ACTIVO` |
| `reportes` | Reportes | `/reportes` | SA, TH | `PROXIMO` |
| `organigrama` | Organigrama | `/organigrama` | SA | `PROXIMO` |

**Roles y acceso a plataforma:**

| Rol | Ve plataforma (`/inicio`) | Módulos visibles |
|-----|--------------------------|------------------|
| SUPERADMIN | ✓ | todos |
| TALENTO_HUMANO | ✓ | paz-y-salvo, capacitaciones, reportes |
| SST | ✗ (directo a `/capacitaciones`) | capacitaciones |
| CONTROL_INTERNO | ✗ (directo a su oficina) | paz-y-salvo |
| AREA | ✗ (directo a mi-area) | paz-y-salvo |

Regla: `rolVePlataforma()` ya existe y retorna true para SA y TH únicamente. No cambia.

---

## 2. Registro Declarativo de Módulos

Hoy los módulos están hardcodeados en tres lugares: `PanelControlPage` (lanzador), `Layout.tsx` (sidebar), `App.tsx` (guards de ruta). Cada módulo nuevo requiere editar los tres.

**La solución:** un único array `MODULOS` en `shared/src/modulos.ts`. Cada módulo declara su `id`, `nombre`, `icono`, `rutaBase`, `rolesQueVen[]`, y `estado: 'ACTIVO' | 'PROXIMO'`.

```typescript
// shared/src/modulos.ts
export interface Modulo {
  id: string
  nombre: string
  icono: string           // nombre de Icon.tsx
  rutaBase: string
  rolesQueVen: RolUsuario[]
  estado: 'ACTIVO' | 'PROXIMO'
}

export const MODULOS: Modulo[] = [ ... ]

export function modulosParaRol(rol: RolUsuario): Modulo[] {
  return MODULOS.filter(m => m.rolesQueVen.includes(rol))
}
```

El sidebar y el lanzador del Panel consumen `modulosParaRol(rol)` en lugar de tener listas inline. Añadir un módulo nuevo = añadir una fila al array.

**Alcance de los cambios:** solo `shared/src/modulos.ts` (nuevo) + ediciones menores en `Layout.tsx` y `PanelControlPage`. Sin cambios de backend ni de BD.

---

## 3. Contrato de Concurrencia — Lo que ya está garantizado

La concurrencia multi-área ya está resuelta en la BD. No hay nada que "arreglar". Lo que sigue es el contrato escrito para que no se toque sin TDD.

### 3.1 Escrituras de área (`cambiarEstadoArea`)

```sql
BEGIN
  SELECT ... FROM aprobaciones WHERE ... FOR UPDATE  -- bloqueo de fila
  UPDATE aprobaciones SET estado = ?
  INSERT INTO observaciones (si aplica)
  -- recálculo del estado global dentro de la misma tx
  SELECT aprobaciones JOIN areas WHERE activa=true
  UPDATE funcionarios SET estado_global = ?
COMMIT
```

- El `SELECT ... FOR UPDATE` serializa escrituras concurrentes sobre la misma fila (mismo funcionario + área). Dos áreas distintas del mismo funcionario pueden avanzar en paralelo sin bloquearse entre sí.
- `calcularEstadoGlobal` es función pura: recibe el array de estados de áreas activas, no tiene efectos. Intocable.
- `recomputarEstado.ts` filtra áreas inactivas (regla D2): una área que se desactiva sale del cálculo.

### 3.2 Hitos TH → CI (`generarLiquidacion`, `registrarLiquidacion`)

```sql
UPDATE funcionarios
SET fecha_liquidacion_generada = now()
WHERE id = ? AND estado_global = 'LISTO_PARA_LIQUIDAR'  -- guarda TOCTOU
RETURNING *
```

Si `RETURNING` devuelve 0 filas: el estado cambió entre la lectura y la escritura → `ErrorValidacion` 400. El frontend refresca y muestra el estado real. No hay ventana de corrupción.

### 3.3 Escala real

30–40 retiros/mes, 1–2 personas por área, raramente todas a la vez. El cuello de botella nunca es la concurrencia de escritura. El único riesgo real es que dos usuarios vean estado desactualizado durante unos segundos → resuelto con Realtime (§4).

---

## 4. Sincronía en Vivo — Supabase Realtime

### Por qué Realtime y no polling

Polling cada N segundos consume instancias serverless Vercel y crea latencia variable. Realtime usa WebSocket directo browser↔Supabase, **sin pasar por Vercel**. Gratis hasta ~200 conexiones concurrentes; el sistema tiene ~25.

### Diseño

**Canal:** un único canal por sesión por usuario, suscrito a la tabla `funcionarios`.

```typescript
// apps/web/src/lib/realtime.ts
supabase
  .channel('funcionarios-sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'funcionarios',
  }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['funcionarios'] })
    queryClient.invalidateQueries({ queryKey: ['metricas'] })
    // si el payload.new.id coincide con el detalle abierto:
    queryClient.invalidateQueries({ queryKey: ['funcionario', payload.new.id] })
  })
  .subscribe()
```

**Qué se invalida:**

| Evento | Claves invalidadas |
|--------|-------------------|
| UPDATE en `funcionarios` | `funcionarios`, `metricas`, `matriz`, `funcionario/<id>` |
| INSERT en `aprobaciones` | `funcionario/<id>`, `mi-area` |

**Dónde se monta:** en `AuthContext` tras la autenticación exitosa. Se desmonta en `signOut`. Un solo canal por usuario autenticado; si el usuario no está activo, no se suscribe.

**RLS en Realtime:** Supabase Realtime respeta las políticas RLS existentes — un usuario de área solo recibe eventos de filas que su política SELECT le permite ver. No se necesita filtro adicional en el cliente.

**CSP:** `vercel.json` ya incluye `connect-src 'self' https://*.supabase.co wss://*.supabase.co`. Sin cambios.

---

## 5. Fluidez en Vercel

### Lo que ya está bien

- **Pool de conexiones:** `pool max: 1` + Supavisor por puerto 6543 (transaction pooler). Correcto para serverless.
- **Región colocada:** `iad1` (Vercel) + `us-east-1` (Supabase). Latencia BD ~5–15ms.
- **Code-split:** `react-vendor`, `data-vendor`, `recharts`, `qrcode` en chunks separados. Bundle inicial < 200KB gzip.
- **Compresión:** `compression` en Express + Vercel Edge comprime automáticamente.
- **Headers de seguridad:** `vercel.json` incluye CSP, HSTS, X-Frame-Options.

### El único caveat honesto: cold starts

En el plan gratuito de Vercel, la función serverless se "duerme" después de ~5 min de inactividad. El primer request tras inactividad tarda 300–800ms adicionales (arranque de Node + pool de pg).

**Mitigaciones (sin costo):**

1. **`/api/health` como keep-alive:** un cron externo (UptimeRobot, gratuito) hace ping cada 5 min. El endpoint ya existe y está exento del rate-limit.
2. **`maxDuration: 10`:** ya configurado en `vercel.json`. Suficiente.
3. **Realtime no sufre cold start:** la conexión WebSocket va directo a Supabase, no a Vercel.

Para los ~25 usuarios internos que usan la app en horario laboral, los cold starts solo ocurren al primer acceso del día. Es aceptable.

---

## 6. Backlog Priorizado

| # | Qué | Por qué | Esfuerzo |
|---|-----|---------|----------|
| P1 | `shared/src/modulos.ts` + consumo en `Layout`/`PanelControlPage` | Elimina hardcoding; añadir módulo = 1 fila | S (2–3h) |
| P1 | `lib/realtime.ts` + mount en `AuthContext` | Sincronía en vivo sin polling | S (2–3h) |
| P2 | Keep-alive con UptimeRobot en `/api/health` | Cold start solo al primer uso del día | 0 (config externa) |
| P3 | Módulos "Reportes" y "Organigrama" | Cuando haya dominio que mostrar | L (sprints separados) |

**No construir ahora:**
- Store compartido de rate-limit (Redis/upstash): innecesario para 25 usuarios internos.
- Presencia en tiempo real (quién está en línea): nunca fue requisito.
- CRDT o merge de conflictos: el bloqueo pesimista de PostgreSQL ya los resuelve.

---

## 7. Sección nueva para CLAUDE.md — §11 Arquitectura de Plataforma

```markdown
## 11. Arquitectura de Plataforma

**Plataforma de Gestión de Talento Humano** contiene módulos independientes. La fuente de
verdad de qué módulos existen y quién los ve vive en `shared/src/modulos.ts` (`MODULOS`,
`modulosParaRol`). El sidebar y el lanzador del Panel consumen esta lista; nunca tienen
módulos hardcodeados.

**Sincronía multi-usuario:** Supabase Realtime suscribe el browser directamente a cambios
en `funcionarios` (y `aprobaciones` para detalle). Los eventos llaman
`queryClient.invalidateQueries` → TanStack Query refetcha solo lo necesario. La conexión
WebSocket NO pasa por Vercel; no consume instancias serverless.

**Concurrencia:** resuelta en la BD (§3 del spec 2026-06-30). No tocar
`recomputarEstado.ts` ni las transacciones de `funcionarioRepository.ts` sin TDD previo.

**Vercel:** keep-alive vía UptimeRobot → `/api/health` (cada 5 min, gratis) elimina cold
starts en horario laboral.
```

---

*Spec cerrado. Implementación: invocar `writing-plans` sobre las tareas P1.*
