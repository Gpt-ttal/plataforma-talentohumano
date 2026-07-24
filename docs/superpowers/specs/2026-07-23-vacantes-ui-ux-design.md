# Vacantes — Diseño de arquitectura UI/UX

> **Estado:** diseño de arquitectura UI/UX aprobado con el usuario (Sesión 2026-07-23), listo para
> implementación. Ninguna pieza de este árbol se crea en esta sesión — es planificación/diseño puro.
>
> **Contexto disparador:** el módulo **Vacantes** (seguimiento de procesos de contratación, fusión
> adaptada de un sistema aparte de Google Apps Script + Sheets) cerró su **fundación backend 100%
> completa** en la Sesión 52: dominio puro (`shared/src/vacantes.ts`), migración `0020_vacantes.sql`
> **aplicada a producción**, 7 endpoints REST bajo `/api/vacantes` (rol SA+TH), 52 tests. Cero UI
> existe todavía — no hay una sola referencia a "vacante" en `apps/web/src`. Al cerrar esa sesión el
> usuario pidió explícitamente diseñar la arquitectura de UI/UX completa antes de tocar código de
> pantallas. Este documento es ese spec: decisiones de vistas, flujos, estados, componentes y tokens
> ya tomadas y justificadas, listo para que una sesión futura implemente sin volver a decidir nada de
> fondo.
>
> Investigación previa (3 agentes de exploración + 1 agente arquitecto + verificación manual de
> archivos críticos) cubrió: modelo de datos y endpoints completos, patrones de UI vivos en
> `apps/web` (componentes de firma, dos convenciones de detalle — página vs. modal —, cliente HTTP,
> Realtime, theming), y el estado real de la documentación. Las 4 decisiones de UX genuinamente
> ambiguas se resolvieron con el usuario vía preguntas directas (referenciadas inline abajo).

---

## 1. Usuarios y contexto

**Quién:** exclusivamente `SUPERADMIN` y `TALENTO_HUMANO` — mismo par de roles que ya usa `/personal`.
Sin rol `AREA`/`CONTROL_INTERNO`/`SST` en este módulo (a diferencia de Paz y Salvo).

**Por qué lo usan:** TH abre una vacante cuando un área pide contratar, la mueve por las 7 fases del
proceso de reclutamiento real (no un trámite de aprobación tipo paz-y-salvo), y necesita ver de un
vistazo cuántas posiciones están vigentes/vencidas y por qué área/motivo. Es **herramienta diaria**
(consulta y edición frecuente), no un formulario que se llena una vez — la misma filosofía de
densidad-al-servicio-de-la-lectura que el resto de la plataforma (§2 `CLAUDE.md`).

**Contexto de uso:** desktop primero (TH trabaja en escritorio con Personal/Capacitaciones abiertos
en paralelo), pero debe seguir el mismo piso responsive que el resto de la plataforma (nunca scroll
horizontal, `min-w-0` en headers, colapso a una columna).

**Restricciones de producto ya fijadas** (no se re-abren en este spec): paleta navy/oro institucional,
Regla del Sello (oro ≤ 10 % de pantalla), Semáforo Único (`shared/src/ui.ts` como única fuente de
color de estado), Regla de la Serif Reservada (`.font-display` solo en títulos), Regla Tabular
(`font-variant-numeric: tabular-nums` en números comparables), Regla Hairline-Primero. Ver `DESIGN.md`
y `CLAUDE.md` §5.

---

## 2. Arquitectura de vistas

```
/vacantes            → Listado (vista por defecto — "herramienta diaria")
/vacantes/resumen     → Dashboard (7 KPIs + 6 series), toggle Segmented "Resumen | Listado"
/vacantes/:id         → Detalle — página dedicada (patrón Personal, no modal)
```

Rutas hermanas top-level (como `/personal` + `/personal/:id`), envueltas en
`<ProtectedRoute roles={["SUPERADMIN","TALENTO_HUMANO"]}>`.

| Decisión | Resuelto como | Por qué |
|---|---|---|
| ¿Dashboard incrustado en el listado o separado? | **Separado**, ruta hermana | El payload de `/api/vacantes/dashboard` es pesado (6 series → 5-6 gráficas Recharts); se carga lazy, mismo patrón que `PanelControlPage.tsx` (`lazy(() => import("./charts/..."))`). `Segmented` (componente ya existente en el código, hoy sin uso activo) conecta ambas vistas — mismo patrón de `role="tablist"` que la vista de supervisión del catálogo. |
| ¿Detalle en modal o página? | **Página dedicada**, no modal | ~16 campos capturados + 4 derivados + `avisos[]`, agrupables en 4 bloques conceptuales (Solicitud, Reclutamiento, Aprobación presupuestal, Cierre/contratación) — misma escala que motivó `ExpedientePage.tsx` en Personal, no el modal más liviano de Capacitaciones. |
| ¿Creación en modal o página? | **Modal-form**, patrón `NuevaCapacitacionModal`/`RegistrarEmpleadoForm` | Solo 3 campos obligatorios (`cargo`, `posiciones`, `fechaRequerimiento`) — no justifica una página. Botón "+ Nueva vacante" en las acciones del `PageHeader` del listado. |

---

## 3. Flujos y estados

`fase` (7 pasos), `aprobacion` (4 valores) y `estado` (5 valores) son **tres ejes independientes** —
el diseño no debe sugerir un único wizard lineal entre ellos. Ver enums en `shared/src/vacantes.ts`.

### 3.1 Flujo: Alta de vacante

**Objetivo:** TH registra una necesidad de contratación nueva sin fricción — mínimo de campos para
arrancar el proceso, el resto se completa progresivamente en el detalle.

**Trigger:** botón "+ Nueva vacante" en `PageHeader` de `/vacantes`.

**Pasos:**
1. Modal `NuevaVacanteModal` abre con 3 campos obligatorios: `cargo` (texto), `posiciones` (número
   ≥ 1), `fechaRequerimiento` (fecha). Campos opcionales visibles pero no bloqueantes: `área`.
2. Al completar `área` + `cargo`, dispara `GET /vacantes/sugerencias` (debounced ~300ms) y
   **pre-rellena** `jefe`/`dedicación`/`modalidad` marcados con badge "Sugerido" — el usuario puede
   aceptar o sobrescribir sin fricción (nunca bloquea el submit).
3. Submit → `POST /vacantes` → éxito cierra el modal y navega a `/vacantes/:id` (el usuario continúa
   directo en el detalle recién creado, no vuelve a un listado que ya no necesita mirar).

**Estados:**
- **Loading:** botón "Crear" pasa a estado disabled + spinner inline (nunca bloquear el modal
  completo — el usuario debe poder seguir viendo lo que escribió).
- **Error de validación:** inline por campo, bajo el input, tono `estado-rechazo`. Nunca alert/toast
  genérico para errores de formulario.
- **Error de red:** banner en la parte superior del modal, con botón "Reintentar" que reenvía el
  mismo payload sin que el usuario deba re-escribir nada.

### 3.2 Flujo: Avance de fase (stepper secuencial)

**Decidido con el usuario: solo secuencial.** Botones Anterior/Siguiente en el stepper, un paso a la
vez — refuerza visualmente el proceso real aunque el backend no impone el orden (`evaluarFila` solo
emite AVISO, no BLOQUEO, si la fase es avanzada sin aprobación).

**Pasos:**
1. Usuario en `/vacantes/:id` ve `FaseVacanteStepper` con las 7 fases, la actual resaltada (único
   hito dorado de la pantalla).
2. Click "Siguiente" → valida en cliente (espejo de `evaluarFila`, función pura de `@pys/shared`,
   sin I/O) → si hay bloqueo real, error inline por campo al instante, **sin llamar al servidor**.
3. Si pasa la validación de cliente → `PATCH /vacantes/:id` con la nueva fase → servidor re-valida
   (autoridad final) → éxito actualiza el stepper con una transición corta (ver §5.3) → error muestra
   el string plano de `mensajesBloqueo` como banner de respaldo bajo el stepper.
4. Click "Anterior" — mismo circuito, sin validación de bloqueo (retroceder nunca bloquea).

**Por qué doble validación (cliente + servidor):** el 422 de bloqueo del servidor es un string plano
concatenado (`mensajesBloqueo`), no estructurado por campo. Como `evaluarFila` es pura y ya vive en
`@pys/shared`, la UI reusa el mismo código para dar error inline por campo al instante sin reinventar
reglas — el servidor sigue siendo la única autoridad que efectivamente bloquea el guardado.

**Estados:**
- **Loading:** el paso en tránsito muestra un pulso sutil en su nodo del stepper (ver §5.3); los
  botones Anterior/Siguiente quedan disabled durante el PATCH.
- **Éxito:** el nodo "actual" se desliza al siguiente paso; no hay confirmación modal — el cambio de
  estado visual en el stepper **es** la confirmación (Regla del Sello: no gastar oro en un check
  adicional).
- **Bloqueo del servidor:** banner rojo bajo el stepper con el string de `mensajesBloqueo`; el
  stepper no avanza.
- **Aviso (no bloqueo):** el paso avanza igual; el `PanelAvisosVacante` al inicio del detalle se
  actualiza con el nuevo aviso (ver §3.4).

### 3.3 Flujo: Edición inline por sección

Cada uno de los 4 bloques conceptuales del detalle (Solicitud, Reclutamiento, Aprobación
presupuestal, Cierre/contratación) tiene su propio editor con guardado independiente.

**Pasos:**
1. Sección en modo lectura por defecto. Click en el ícono de editar (o en cualquier valor) activa el
   modo edición de **esa sección únicamente** — las demás permanecen read-only.
2. Edición inline, sin modal. Botones "Guardar"/"Cancelar" aparecen al pie de la sección en edición.
3. "Guardar" → `PATCH /vacantes/:id` con **solo** los campos de esa sección (parcial) → éxito vuelve
   a modo lectura con los valores actualizados; error mantiene el modo edición con el error inline.
4. "Cancelar" descarta cambios locales sin llamar al servidor y vuelve a modo lectura.

**Estado `CierreEditor`:** solo se habilita/muestra cuando `estado === "CONTRATADO"` (campos
`cedula`, `fechaContratacion`); en cualquier otro estado capturado permanece oculto, no
deshabilitado-y-visible (evita ruido de campos que no aplican todavía).

### 3.4 Avisos — panel agregado (v1)

**Decidido con el usuario: solo panel agregado v1.** Lista "Avisos" al inicio del detalle, tono
gold/ámbar (no rojo — no es error, es una señal de atención). El marcador inline por campo queda
como mejora incremental futura, fuera de este alcance.

- **Vacío:** el panel no se renderiza en absoluto si `avisos.length === 0` — no mostrar un
  "sin avisos" vacío que compita por atención con el resto del detalle.
- **Con avisos:** lista simple, cada ítem con el texto del aviso; sin acción asociada en v1 (solo
  informativo).

### 3.5 Densidad de la fila del listado

**Decidido con el usuario: solo `status`.** La cabecera de `FilaDesplegable` muestra únicamente el
STATUS derivado (VIGENTE/VENCIDA/CUBIERTA/CERRADA, helper `estadoVacantePill` ya existente en
`shared/src/ui.ts:576`); `fase`, `aprobacion` y `estado` capturado quedan en el cuerpo expandido —
evita saturar la fila colapsada con 3 semáforos distintos compitiendo por lectura.

### 3.6 Filtro de área

**Decidido con el usuario: `<select>` nativo**, mismo estilo de input que el resto de formularios del
módulo — escala sin depender de cuántas áreas tenga la Corporación (a diferencia de `ChipFiltro`,
que asume un set pequeño y fijo de valores, como los 5 de `estado`).

### 3.7 Estados transversales de las 3 vistas

| Vista | Loading | Empty | Error |
|---|---|---|---|
| `/vacantes` (listado) | `ListaSkeleton` (ya existente) mientras carga la página | `EmptyState` con CTA "+ Nueva vacante" si no hay ninguna vacante; mensaje distinto si el vacío es por filtro activo ("Ninguna vacante coincide con tu búsqueda") vs. catálogo realmente vacío | Banner de reintento sobre la lista, no reemplaza el listado si ya había datos cacheados (stale-while-error) |
| `/vacantes/resumen` (dashboard) | Skeleton por gráfica (mismo alto que la gráfica real, evita salto de layout) mientras se resuelve el `lazy()` + el fetch | `EmptyState` solo si el catálogo completo está vacío (no hay "vacío parcial" en un dashboard) | Cada gráfica falla independiente — una gráfica en error no tumba el resto del dashboard |
| `/vacantes/:id` (detalle) | Skeleton de página completa (header + 4 secciones en placeholder) | No aplica (404 si el id no existe → página "no encontrado" con link de vuelta a `/vacantes`) | Banner de página completa si el fetch inicial falla; error de PATCH por sección queda contenido en esa sección (§3.3) |

---

## 4. Especificación de componentes

### 4.1 Reusados tal cual (sin cambios)

`Buscador` (`?q=`) · `ChipFiltro` (para `estado`, 5 valores) · `Paginacion` · `FilaDesplegable` ·
`PageHeader` · `EmptyState` · `ListaSkeleton` · `Segmented` (toggle Resumen/Listado) · `Modal`
(creación). **`Avatar` no aplica** (una Vacante no es una persona — no hay iniciales que mostrar).

### 4.2 `EstadoVacantePill` / pills nuevos

Archivo nuevo `apps/web/src/components/ui/VacantePills.tsx` — **no** dentro de `EstadoPill.tsx`, que
es específico de Paz y Salvo. Mismo patrón que `EstadoGlobalPill`/`EstadoAreaPill`: componente
delgado que solo consume el mapa de `@pys/shared` y renderiza `className`/`dot`/`label`, cero lógica
de color en el componente (Regla del Semáforo Único).

```tsx
export function EstadoVacantePill({ status }: { status: StatusVacante }) {
  const { className, dot, label } = estadoVacantePill(status) // ya existe, shared/src/ui.ts:576
  return (
    <span className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function EstadoCapturadoVacantePill({ estado }: { estado: EstadoVacante }) { /* nuevo */ }
export function AprobacionVacantePill({ aprobacion }: { aprobacion: AprobacionPresupuestoVacante }) { /* nuevo, 4 valores */ }
export function FaseVacantePill({ fase }: { fase: FaseVacante }) { /* nuevo, tono neutro único */ }
```

| Estado | Variantes | Uso |
|---|---|---|
| Default | 4 pills, cada uno consumiendo su propio mapa de `ui.ts` | Fila del listado (solo `EstadoVacantePill`, §3.5) y cuerpo expandido/detalle (los 4) |
| Hover/Focus | No aplica — son `<span>` informativos, no interactivos | — |
| Responsive | Sin cambios por breakpoint; el texto del label nunca trunca (labels cortos por diseño) | — |

**Accesibilidad:** el color nunca es el único indicador — cada pill lleva punto + texto (ya es el
patrón de `EstadoGlobalPill`). Sin `aria-label` adicional porque el texto ya es el contenido
accesible del `<span>`.

### 4.3 `FaseVacanteStepper`

Nuevo componente de **layout** (no es un pill) en `apps/web/src/pages/vacantes/FaseVacanteStepper.tsx`.

**Propósito:** track horizontal de 7 pasos con navegación estrictamente secuencial (§3.2).

```typescript
interface FaseVacanteStepperProps {
  faseActual: FaseVacante
  onAvanzar: () => void  // deshabilitado en el último paso
  onRetroceder: () => void  // deshabilitado en el primer paso
  cargando?: boolean  // deshabilita ambos botones durante el PATCH en vuelo
}
```

**Estados por posición relativa (3 tonos, no 7 colores distintos):**

| Posición | Tono | Regla |
|---|---|---|
| Completado | `estado-ok` tenue (mismo verde que "OK" en el resto de la plataforma) | Nunca dorado — el oro se reserva para el paso actual |
| Actual | **oro** — único hito dorado de la pantalla de detalle | Regla del Sello: si cualquier otro elemento de la pantalla usara oro, esta jerarquía se rompe |
| Pendiente | `pendiente`/plata, texto `muted` | Igual que el resto de la plataforma para "aún no ocurre" |

**Interacción:** el nodo "actual" recibe un pulso sutil de foco (`animate-card-in`-style, no un glow
neón — ver §5.3). Los nodos no son clickeables directamente (evita saltar fases); solo los botones
Anterior/Siguiente mutan el estado, reforzando visualmente "un paso a la vez".

**Accesibilidad:** `role="list"`, cada paso `role="listitem"` con `aria-current="step"` en el actual.
Botones Anterior/Siguiente son `<button>` reales (nunca `<div onClick>`), con `aria-disabled` en los
extremos. Navegable con Tab + Enter/Space, sin necesidad de flechas (no es un `tablist`, es una
secuencia lineal de acciones).

**Responsive:** en mobile (`<640px`) el track colapsa a "Paso X de 7: [nombre de fase]" + los mismos
dos botones, en vez de intentar comprimir 7 nodos horizontales (que rompería la Regla
Hairline-Primero al forzar líneas de conexión ilegibles).

### 4.4 `PanelAvisosVacante`

Nuevo, no reusable fuera del módulo. Panel simple tono gold/ámbar (`bg-estado-listoBg` / equivalente
del semáforo `listo`) al inicio del detalle, antes del stepper.

```typescript
interface PanelAvisosVacanteProps {
  avisos: string[]
}
```

Se renderiza **condicionalmente** (§3.4) — el componente padre decide no montarlo si `avisos` está
vacío, en vez de que el componente retorne `null` internamente (evita un salto de layout invisible
por un componente que ocupa espacio-cero pero sigue en el árbol).

### 4.5 Editores de sección (`secciones/*.tsx`)

Cuatro componentes con la misma forma: `SolicitudEditor`, `ReclutamientoEditor`, `AprobacionEditor`,
`CierreEditor`. Todos comparten el mismo contrato de props y el mismo ciclo lectura↔edición (§3.3).

```typescript
interface SeccionEditorProps<T> {
  valores: T
  editable: boolean       // true solo si esta sección está en modo edición
  guardando: boolean
  onEditar: () => void
  onGuardar: (parcial: Partial<T>) => Promise<void>
  onCancelar: () => void
}
```

| Estado | Visual | Comportamiento |
|---|---|---|
| Lectura | Valores en texto plano, ícono de lápiz al pasar el mouse sobre la sección | Click en el lápiz o en cualquier valor entra a edición |
| Edición | Inputs nativos del sistema (mismo estilo que el resto de formularios), botones Guardar/Cancelar al pie | Solo esta sección editable; el resto del detalle permanece en lectura |
| Guardando | Botón "Guardar" disabled + spinner inline | PATCH en vuelo, sección bloqueada hasta resolver |
| Error | Mensaje inline bajo el campo afectado, tono `estado-rechazo` | Permanece en modo edición para que el usuario corrija sin perder lo escrito |

**`CierreEditor`** difiere: solo se monta cuando `estado === "CONTRATADO"` (§3.3) — no forma parte del
ciclo lectura/edición de las otras 3 hasta que ese estado se alcanza.

### 4.6 Gráficas del dashboard (`charts/*.tsx`)

Seis componentes, todos reusando `chartTheme.tsx` de `pages/panel/charts/` (no duplicar tokens de
color de gráficas): `DonutPorStatus`, `BarrasPorArea`, `BarrasPorFase`, `BarrasPorMotivo`,
`BarrasFuentesContratados`, `LineaContratacionesPorMes`.

| Estado | Visual |
|---|---|
| Loading | Skeleton con el mismo alto/ancho que la gráfica final (evita salto de layout al resolver) |
| Vacío (serie sin datos) | Mensaje corto centrado dentro del contenedor de la gráfica, no un `EmptyState` completo (sería demasiado peso visual para una sola tile del dashboard) |
| Error | Mensaje corto + ícono, contenido dentro de esa tile — nunca tumba las demás gráficas (§3.7) |

**Regla Tabular:** todo eje/label numérico de estas gráficas usa `font-variant-numeric: tabular-nums`
igual que el resto de números comparables de la plataforma.

---

## 5. Tokens y reglas de sistema

### 5.1 Adiciones a `shared/src/ui.ts` (descritas, a escribir en la sesión de implementación)

Todo respeta la Regla del Semáforo Único (una sola fuente de color por estado):

```ts
// Estado capturado del ciclo de vida (5 valores) — mapeo semáforo:
// PENDIENTE=pendiente/plata · CONTRATADO=ok/verde · CANCELADA=rechazo/rojo ·
// PAUSADA=listo/oro · CERRADA_PROMOCION=info/azul
export const ESTADO_VACANTE_BADGE: Record<EstadoVacante, string>
export const ESTADO_VACANTE_DOT: Record<EstadoVacante, string>
export function estadoCapturadoVacantePill(estado): {className; dot; label}

// Aprobación presupuestal (4 valores) — mismo patrón que ESTADO_AREA_BADGE:
// SOLICITADO=pendiente/plata · EN_REVISION=info/azul · APROBADO=ok/verde · NO_APROBADO=rechazo/rojo
export const APROBACION_VACANTE_LABEL / _BADGE: Record<AprobacionPresupuestoVacante, string>
export function aprobacionVacantePill(aprobacion): {className; label}

// Fase (7 valores, progreso secuencial — NO es semáforo de calidad):
export const FASE_VACANTE_LABEL: Record<FaseVacante, string>
export const FASE_VACANTE_BADGE: string  // un solo tono info/azul, fuera del stepper
export function faseVacantePill(fase): {className; label}
export const FASE_VACANTE_PASO_TONO: Record<"completado"|"actual"|"pendiente", string>
export function indiceFaseVacante(fase): number
```

`ESTADO_VACANTE_LABEL` ya existe (`shared/src/ui.ts:540-546`); solo faltan `_BADGE`/`_DOT`/pill.
`estadoVacantePill(status)` (el STATUS derivado) se deja intacto (`ui.ts:576`).

### 5.2 Colores — reusar, no crear

Ningún token de color nuevo. Los 4 pills nuevos y el stepper se apoyan exclusivamente en los tonos
semánticos ya definidos en `DESIGN.md`/`CLAUDE.md` §5 (`ok`/`info`/`listo`/`pendiente`/`rechazo` +
`gold` reservado al hito). Cero justificación de producto para ampliar la paleta — este módulo no
introduce ningún estado que no encaje ya en el semáforo existente.

### 5.3 Motion — vocabulario ya vigente en la plataforma, aplicado sin inventar uno nuevo

La plataforma ya tiene un vocabulario de movimiento consistente (`animate-card-in` en `PageHeader`,
`transition-all duration-200` en `Segmented`, `shadow-luxe` → `shadow-luxe-lg` en hover de
`FilaDesplegable`). Vacantes **no introduce una librería de animación nueva** — extiende ese mismo
vocabulario, calibrado para una herramienta de uso diario donde el movimiento nunca debe sentirse
más lento que el trabajo real del usuario:

| Elemento | Trigger | Duración | Easing | Nota |
|---|---|---|---|---|
| Nodo del stepper (actual → siguiente) | Avance de fase confirmado por el servidor | 200ms | `ease-out` (custom, no el `ease` plano de CSS) | Es la única confirmación visual del avance — no hay modal ni toast adicional (Regla del Sello: no gastar oro en un check redundante) |
| Botones Guardar/Cancelar de un editor de sección | `:active` | 120-160ms | `ease-out` | `transform: scale(0.97)` — mismo lenguaje táctil que el resto de botones primarios de la plataforma |
| `PanelAvisosVacante` al aparecer | Nuevo aviso llega por Realtime | 200ms | `ease-out` | Entra con opacidad + traslado corto (`translateY` desde `-4px`, nunca `scale(0)` — nada aparece de la nada); nunca un salto duro |
| Modal `NuevaVacanteModal` | Abrir/cerrar | 200ms entrada / 150ms salida | `ease-out` entrada, salida más rápida que la entrada | Mismo patrón que `Modal` existente — `transform-origin: center` (es modal, no popover anclado a un trigger) |
| Skeletons de gráficas del dashboard | Mientras se resuelve el `lazy()` + fetch | — | — | Shimmer sutil, nunca un spinner circular genérico — comunica "esto va a tener esta forma" |
| Toda la plataforma | — | — | — | `prefers-reduced-motion: reduce` ya respetado globalmente — Vacantes hereda esa media query sin añadir excepciones |

**Qué NO se anima:** ningún atajo de teclado ni la navegación Anterior/Siguiente del stepper en sí
misma (el contenido cambia instantáneo; solo el nodo de progreso anima) — es una acción que TH repite
docenas de veces al día por vacante, y una animación ahí se sentiría lenta, no elegante.

### 5.4 Accesibilidad transversal

- Contraste WCAG 2.1 AA en los 4 pills nuevos (heredan los mismos pares texto/fondo ya auditados del
  semáforo existente — cero combinación nueva que auditar).
- Todo elemento interactivo nuevo (`FaseVacanteStepper`, editores de sección, `NuevaVacanteModal`)
  navegable de extremo a extremo por teclado, con foco visible (anillo oro, mismo token que el resto
  de la plataforma).
- `es-CO` en formato de fechas (`fechaRequerimiento`, `fechaAprobacion`, `fechaContratacion`) y
  números (`posiciones`, salario si aplica) — mismas utilidades ya existentes en `ui.ts`
  (`formatMoneda`, formateadores de fecha).

---

## 6. Árbol de archivos (a crear en la sesión de implementación)

```
apps/web/src/pages/vacantes/
├── VacantesPage.tsx            # listado: Buscador + ChipFiltro(estado) + select área + Segmented
├── VacantesResumenPage.tsx     # dashboard, charts lazy-loaded
├── VacanteDetallePage.tsx      # /vacantes/:id — header sticky + secciones ancladas
├── NuevaVacanteModal.tsx       # creación (modal-form)
├── AccionesVacante.tsx         # avanzar fase (secuencial) / aprobación / marcar estado
├── FaseVacanteStepper.tsx
├── secciones/                  # editores inline por bloque, todos ⇒ mismo PATCH parcial
│   ├── SolicitudEditor.tsx     # cargo, posiciones, área, jefe, reemplazo, nombreNuevo, motivo, fechaRequerimiento
│   ├── ReclutamientoEditor.tsx # modalidad, dedicación, escalafón, fuente, salario
│   ├── AprobacionEditor.tsx    # aprobacion, fechaAprobacion
│   └── CierreEditor.tsx        # cedula, fechaContratacion (solo si estado=CONTRATADO)
└── charts/                     # reusa chartTheme.tsx de pages/panel/charts/ (no duplicar)
    ├── DonutPorStatus.tsx · BarrasPorArea.tsx · BarrasPorFase.tsx · BarrasPorMotivo.tsx
    └── BarrasFuentesContratados.tsx · LineaContratacionesPorMes.tsx

apps/web/src/components/ui/VacantePills.tsx   # los 4 pills

apps/web/src/hooks/useVacantes.ts   # CLAVE="vacantes"; useVacantes/useVacanteDetalle/
                                     # useVacantesDashboard/useVacantesCatalogos/
                                     # useSugerenciasVacante/useCrearVacante/useEditarVacante

apps/web/src/lib/api.ts
  # 1. Añadir `patch: <T>(path, body?) => request<T>("PATCH", path, body)` al objeto base `api`
  #    (hoy solo tiene get/post/blob/multipart — Vacantes es el primer módulo que usa PATCH real,
  #    a diferencia de apiPersonal que simula "editar" con POST a una subruta)
  # 2. + apiVacantes (namespace nuevo, patrón apiPersonal): listar/detalle/dashboard/catalogos/
  #    sugerencias/crear/editar (usa api.patch)
  # 3. Tipo de respuesta de catalogos() ad hoc (CatalogosVacantes no vive en @pys/shared, solo
  #    en apps/backend/src/domain/ports/VacanteRepo.ts) — definir localmente en api.ts

apps/web/src/lib/realtime.ts
  # + .on("postgres_changes", {table:"vacantes"}, invalidarVacantes)
  # invalidarVacantes = () => qc.invalidateQueries({queryKey:["vacantes"]})
  # (no hace falta nada para los 5 catálogos — sin UI de administración, solo editables por seed)

apps/web/src/components/Layout.tsx
  # 1. IconName local: agregar "briefcase"
  # 2. routeLabels: {path:"/vacantes", title:"Vacantes", section:"Administracion"}
  # 3. sectionsForRole: item nuevo en el grupo "administracion" de SUPERADMIN y TALENTO_HUMANO

apps/web/src/App.tsx
  # 3 rutas nuevas hermanas de /personal: /vacantes, /vacantes/resumen, /vacantes/:id
```

**Backend: sin cambios** (100 % completo). **`shared/src/modulos.ts`: sin cambios** (ya registrado
correctamente).

---

## 7. Handoff de implementación

**Agente destino:** `react-vite-tailwind-engineer` (SPA pura sobre Vite + React, sin SSR/SEO — mismo
target que el resto de `apps/web`).

**Por qué:** el stack ya está fijado (Vite + React + TanStack Query, sin Next.js); esta decisión no
está en juego en este spec.

**Orden sugerido de implementación** (cada paso deja el build/tests en verde antes del siguiente):

1. `shared/src/ui.ts` — tokens de §5.1 + tests de los pills nuevos (TDD, mismo patrón que los pills
   existentes).
2. `apps/web/src/lib/api.ts` — `api.patch` + `apiVacantes`.
3. `apps/web/src/hooks/useVacantes.ts`.
4. `VacantePills.tsx` + `FaseVacanteStepper.tsx` (componentes de presentación, sin fetch).
5. `VacantesPage.tsx` (listado) → `NuevaVacanteModal.tsx` → `VacanteDetallePage.tsx` + 4 editores de
   sección → `VacantesResumenPage.tsx` + 6 gráficas.
6. `Layout.tsx` + `App.tsx` (cablear rutas y navegación al final, cuando las páginas ya existen).
7. `realtime.ts` (invalidación en vivo).

### Criterios de aceptación

- [ ] Las 3 rutas (`/vacantes`, `/vacantes/resumen`, `/vacantes/:id`) renderizan protegidas por
      `<ProtectedRoute roles={["SUPERADMIN","TALENTO_HUMANO"]}>` y aparecen en `Layout.tsx` solo para
      esos roles.
- [ ] El listado reusa `Buscador`/`Paginacion`/`FilaDesplegable`/`ListaSkeleton`/`EmptyState` sin
      duplicar su lógica; la fila colapsada muestra solo `EstadoVacantePill` (§3.5).
- [ ] Creación: los 3 campos obligatorios bloquean el submit si faltan; `GET /vacantes/sugerencias`
      pre-rellena sin bloquear; éxito navega a `/vacantes/:id`.
- [ ] El stepper de fase solo permite avance secuencial (Anterior/Siguiente), valida en cliente con
      `evaluarFila` antes de llamar al servidor, y el string de `mensajesBloqueo` aparece como banner
      de respaldo si el servidor bloquea.
- [ ] Cada uno de los 4 editores de sección guarda de forma independiente vía PATCH parcial; ninguno
      bloquea la edición de los otros 3 mientras uno está en modo edición.
- [ ] `CierreEditor` solo se monta cuando `estado === "CONTRATADO"`.
- [ ] `PanelAvisosVacante` no se renderiza si `avisos` está vacío.
- [ ] El dashboard carga lazy, cada gráfica maneja su propio estado de error sin tumbar las demás, y
      usa `chartTheme.tsx` existente sin duplicar tokens de color.
- [ ] Cero tokens de color nuevos fuera de los descritos en §5.1 — todo pill usa el semáforo
      existente.
- [ ] Ninguna animación nueva excede 300ms (§5.3); `prefers-reduced-motion` respetado sin excepciones.
- [ ] Contraste AA verificado en los 4 pills nuevos; navegación de teclado completa en stepper,
      editores y modal de creación.
- [ ] Gate de cierre del proyecto en verde: `build shared` → tests ×3 → `tsc --noEmit` backend y web
      → `npm run build` raíz.
