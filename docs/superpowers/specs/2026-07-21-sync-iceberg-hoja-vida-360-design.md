# Sync Iceberg → Hoja de Vida 360° — Diseño

> **Estado:** aprobado el diseño de arquitectura y modelo de datos (Sesión con Leonardo, 2026-07-21).
> Pendiente: revisión de esta spec por el usuario → plan de implementación.
>
> **Contexto disparador:** correo "SOLICITUD MANEJO DE DATOS ICEBERG" (Laura Armenta, TH, 2026-07-21)
> pidiendo autorización para tratar 28 atributos de Iceberg en la Plataforma de Administración de
> Personal. Este documento diseña cómo el módulo **Hoja de Vida 360°** soporta, ingesta y procesa
> esos atributos. La **capa de transporte** (cómo el flujo n8n+SQL de Analítica de Datos entrega el
> dato) se especifica aparte en
> [`2026-07-21-integracion-iceberg-opciones-analitica.md`](2026-07-21-integracion-iceberg-opciones-analitica.md)
> porque depende de un equipo externo y no la controlamos.

---

## 1. Objetivo

Que el módulo Hoja de Vida 360° pueda **soportar, ingestar y procesar** los 28 atributos que TH
quiere traer desde Iceberg, por **dos canales independientes**:

1. **Sync automático (Iceberg → n8n → nosotros):** entra como **lote pendiente de revisión**; nunca
   escribe directo al expediente. TH revisa y confirma.
2. **Onboarding manual presencial:** TH diligencia en tiempo real mientras el funcionario firma el
   contrato. Usa los casos de uso ya existentes (`crearEmpleado`, `guardarPersonales`,
   `guardarSalarial`, …). **No cambia con este diseño.**

No-objetivos (v1): población/actualización 100% automática sin revisión humana (ver §8, dejado
listo como evolución futura); definir la mecánica de transporte con Analítica de Datos (spec aparte).

---

## 2. Gap analysis — 28 atributos vs. esquema actual

Base: `docs/data/DICCIONARIO-DATOS.md` + `shared/src/domain.ts` (migraciones 0001–0018).

| # | Atributo Iceberg | ¿Existe hoy? | Ubicación actual / acción |
|---|---|---|---|
| 1 | Cédula | ✅ | `funcionarios.documento` (UNIQUE) |
| 2 | Nombre completo | ✅ | `funcionarios.nombre_completo` |
| 3 | Sexo | ✅ | `empleado_personales.genero` (enum `genero`) |
| 4 | Tipo de documento | ❌ **nuevo** | `funcionarios.tipo_documento` (enum nuevo) |
| 5 | Fecha de expedición del documento | ✅ | `empleado_personales.fecha_expedicion` |
| 6 | Nacionalidad | ❌ **nuevo** | `funcionarios.nacionalidad` (text) |
| 7 | Fecha de nacimiento | ✅ | `empleado_personales.fecha_nacimiento` |
| 8 | Lugar de residencia | ❌ **nuevo** | `empleado_personales.lugar_residencia` (distinto de `municipio`/`lugar_nacimiento`) |
| 9 | Dirección | ✅ | `empleado_personales.direccion` |
| 10 | Teléfono | ✅ | `funcionarios.telefono` |
| 11 | Barrio | ✅ | `empleado_personales.barrio` |
| 12 | Estado civil | ❌ **nuevo** | `empleado_personales.estado_civil` (enum nuevo) |
| 13 | Personas a cargo / dependientes económicos | ⚠️ parcial | `empleado_familiares` (1-N) + flag nuevo `dependiente_economico` bool |
| 14 | Correo electrónico | ✅ | `funcionarios.correo_institucional` + `empleado_personales.correo_personal` |
| 15 | Cargo actual | ✅ | `funcionarios.cargo` |
| 16 | Estado del contrato | ✅ derivado | `EstadoVinculacion` (derivado de `fecha_retiro`+`estado_global`, `personal.ts`) |
| 17 | Centro de costos (CeCo) | ❌ **nuevo** | `funcionarios.centro_costos` (text) |
| 18 | Fondo / sede de trabajo | ❌ **nuevo** | catálogo `fondos_sede` + `funcionarios.fondo_sede_id` FK |
| 19 | Fecha de ingreso | ✅ | `funcionarios.fecha_ingreso` |
| 20 | Fecha de finalización | ✅ | `funcionarios.fecha_fin_contrato` |
| 21 | Dependencia | ✅ | `funcionarios.area_origen` / `area_id` |
| 22 | Tipo de empleado | ✅ | `funcionarios.tipo_vinculacion` (enum `tipo_vinculacion`) |
| 23 | Tipo de contrato | ✅ | `funcionarios.tipo_contrato` (enum `tipo_contrato`) |
| 24 | Salario | ✅ sensible | `empleado_salarial.salario_basico` (RLS `ve_salarial()`) |
| 25 | Categoría | ❌ **nuevo** | `funcionarios.categoria` (text; semántica a definir luego) |
| 26 | EPS | ✅ sensible | `empleado_salarial.eps` |
| 27 | Fondo de pensiones **y cesantías** | ⚠️ parcial | `empleado_salarial.afp` (pensión) ya existe; **falta** `fondo_cesantias` (text) |
| 28 | Certificado bancario | ❌ **nuevo** | tabla `empleado_bancario` (1-1, RLS estricta) — **estructura TBD** (§4.5) |

**Resumen:** 18 ya cubiertos, 2 parciales (13, 27), 8 nuevos (4, 6, 8, 12, 17, 18, 25, 28).

---

## 3. Arquitectura

```
┌─────────────┐   transporte     ┌──────────────────────┐   confirmación     ┌────────────────┐
│  Iceberg    │   (spec aparte)  │  STAGING (lote)      │   manual de TH     │  EXPEDIENTE     │
│  (n8n+SQL)  │ ───────────────► │  lotes_sync_personal │ ─────────────────► │  funcionarios + │
│  Analítica  │                  │  filas_sync_personal │                    │  satélites      │
└─────────────┘                  └──────────────────────┘                    └────────────────┘
                                         ▲                                          ▲
                                         │ revisión campo-por-campo                 │ escritura directa
                                    ┌────┴─────┐                              ┌─────┴──────┐
                                    │ Pantalla │                              │ Onboarding │
                                    │ revisión │                              │  manual    │
                                    │   (TH)   │                              │ presencial │
                                    └──────────┘                              └────────────┘
```

**Principios:**

- **La ingesta nunca escribe directo al expediente.** Todo sync aterriza en staging.
- **Reutiliza el patrón ya probado de Desvinculaciones** (`lotes_importacion` / `filas_lote`,
  estados `CARGADO → PREVISUALIZADO → CONFIRMADO_PARCIAL → CONFIRMADO_TOTAL`), incluida la máquina de
  estados de fila (`fila_lote_estado`).
- **Staging tipado (columnas), no JSONB** — coherente con el resto del esquema; el único JSONB del
  repo es `eventos_auditoria` (bitácora libre, no entidad de negocio).
- **Upsert por cédula al confirmar:** si `documento` no existe → alta de empleado nuevo; si existe →
  actualiza los campos que trae Iceberg. Cubre poblar el sistema desde cero.
- **Autoridad del dato (v1):** el sync re-puebla los campos que trae Iceberg; una edición manual
  posterior **no** queda protegida (el próximo sync puede pisarla). Mitigación barata: cada
  sobrescritura de un valor distinto ya presente registra un `eventos_auditoria`
  (`estado_anterior`/`estado_nuevo`) — trazabilidad sin bloquear. Ver §8 para la evolución.
- **El canal manual es independiente** y no se toca.

---

## 4. Cambios de esquema (migración nueva, siguiente número disponible)

Todas las columnas nuevas en tablas existentes son **nullable** → no rompen filas actuales ni el
contrato de `Funcionario` (proyección de Paz y Salvo intacta).

### 4.1 Enums nuevos (Postgres + espejo en `shared/src/domain.ts`)

| Enum | Valores (ajustables antes de migrar) |
|---|---|
| `tipo_documento` | CC · CE · TI · PA · PEP · NIT |
| `estado_civil` | SOLTERO · CASADO · UNION_LIBRE · SEPARADO · DIVORCIADO · VIUDO |
| `tipo_cuenta_bancaria` | AHORROS · CORRIENTE |

### 4.2 `funcionarios` — columnas nuevas
`tipo_documento` enum · `nacionalidad` text · `centro_costos` text · `categoria` text
(semántica a definir después) · `fondo_sede_id` uuid FK→`fondos_sede`. Todas nullable.

### 4.3 `empleado_personales` — columnas nuevas
`estado_civil` enum · `lugar_residencia` text. Ambas nullable.

### 4.4 `empleado_salarial` — columna nueva
`fondo_cesantias` text (nullable). Hereda la RLS estricta existente (`ve_salarial()`, solo SA/TH).

### 4.5 `empleado_bancario` — tabla 1-1 nueva **(estructura TBD)**
PK = `funcionario_id` FK→funcionarios (cascade). **RLS estricta idéntica a `empleado_salarial`**
(solo SUPERADMIN/TALENTO_HUMANO vía `ve_salarial()`; deny-directo). Campos placeholder hasta ver el
payload real de Iceberg: `banco` text · `tipo_cuenta` enum `tipo_cuenta_bancaria` · `numero_cuenta`
text · `titular` text · `updated_at`. **Bloqueante para cerrar esta tabla:** formato exacto que
entrega Iceberg (decisión pospuesta a propósito).

### 4.6 `fondos_sede` — catálogo nuevo (patrón de `areas`)
`id` uuid PK · `nombre` text UNIQUE · `activa` boolean default true. Se puebla con las sedes reales
(seed en la propia migración). Deny-directo; lectura vía backend.

### 4.7 `empleado_familiares` — columna nueva
`dependiente_economico` boolean default false. Distingue "familiar" de "dependiente económico"
(atributo 13) sin crear tabla nueva.

### 4.8 Staging — `lotes_sync_personal` / `filas_sync_personal`
Espejo de `lotes_importacion` / `filas_lote`:

- **`lotes_sync_personal`**: `id` · `origen` text (default `'ICEBERG'`) · `estado` enum `lote_estado`
  · `total_filas` int · `filas_confirmadas` int · `creado_por` text · `created_at`/`updated_at`.
  Deny-directo; acceso solo backend con guarda SA/TH.
- **`filas_sync_personal`**: `id` · `lote_id` FK (cascade) · `numero_fila` int
  (UNIQUE(lote_id, numero_fila)) · **una columna tipada por atributo sincronizable** (los 28, con los
  sensibles marcados) · `estado` enum `fila_lote_estado` (reusado) · `mensaje_error` text ·
  `funcionario_id` FK (poblado al confirmar).

---

## 5. Dominio y tipos (`shared/src/domain.ts`)

- Nuevos tipos union + arrays `as const`: `TipoDocumento`, `EstadoCivil`, `TipoCuentaBancaria`.
- Extender `DatosPersonales` (estado civil, lugar de residencia), `EmpleadoContractual`
  (tipo documento, nacionalidad, CeCo, categoría, fondo/sede), `DatosSalariales` (fondo de cesantías).
- Nuevo `DatosBancarios` (bloque sensible, forma TBD) + añadirlo a `ExpedienteCompleto` con la misma
  semántica de visibilidad que `salarial` (`bancarioVisible` / `undefined` vs `null`).
- Nuevos tipos de staging: `LoteSyncPersonal`, `FilaSyncPersonal`, filtros y `ResultadoPaginado`.
- `shared` se buildea antes de que backend/web vean los cambios (regla del repo).

---

## 6. Backend (hexagonal, `container.ts` inyecta repos)

- **Endpoint de ingesta** (transporte TBD, spec aparte): recibe el batch, crea
  `lotes_sync_personal` en estado `CARGADO`, parsea cada registro a `filas_sync_personal` con
  validación (Zod) → `VALIDA` / `CON_ERROR` / `DUPLICADA`. Reutiliza el parser/validador de
  Desvinculaciones como referencia (`parsearArchivoDesvinculaciones.ts`).
- **Casos de uso nuevos** (`application/personal/sync/…`): `previsualizarLoteSync`,
  `confirmarFilaSync`, `confirmarLoteSyncParcial`, `descartarFilaSync`. Espejo de
  `previsualizarImportacionDesvinculaciones` / `confirmarImportacionParcial`.
- **Reparto al confirmar** (transacción, patrón `FOR UPDATE` + upsert por `documento`): distribuye
  los valores de la fila a `funcionarios`, `empleado_personales`, `empleado_salarial`,
  `empleado_bancario`, y resuelve `fondo_sede_id` contra el catálogo (crea la sede si el nombre no
  existe, o marca error — a decidir en el plan). Registra `eventos_auditoria` en cada sobrescritura
  de valor distinto.
- **Guardas:** todas las rutas de sync requieren `requireAuth` + `requireRol(SUPERADMIN,
  TALENTO_HUMANO)`; `paramUuid` en rutas con `:id`. La ingesta usa el mecanismo de auth de servicio
  que defina la spec de integración (no reusar el JWT de usuario).
- **TDD obligatorio** para: validación/parseo de filas, lógica de upsert por cédula, reparto a
  tablas satélite, y visibilidad RLS de bancario/salarial. No testear plomería.

---

## 7. Frontend (`apps/web`, Administración de Personal)

- **Pantalla de revisión de lote** (reusa patrones de la de Desvinculaciones): lista de filas del
  lote con diff campo-por-campo (valor actual vs. valor Iceberg; badge "nuevo ingreso" si la cédula
  no existe), acciones confirmar-fila / confirmar-todo / descartar. Server-driven por searchParams.
- **Ficha del expediente**: nuevas secciones/campos (tipo doc, nacionalidad, estado civil, lugar de
  residencia, CeCo, categoría, fondo/sede, fondo de cesantías, bloque bancario). El bloque bancario
  respeta `bancarioVisible` igual que el salarial ("restringido" vs "vacío").
- Respetar Reglas Nombradas (Sello, Semáforo, Serif, Tabular, Hairline) y WCAG AA. Sin color como
  único portador de significado.

---

## 8. Evolución futura — automatización con evaluación inteligente (dejado listo, NO en v1)

Punto de extensión reservado por decisión del usuario. En el futuro, el sync podría **poblar y
actualizar automáticamente sin revisión manual**, pero **con filtros y evaluación inteligente** en
vez de confirmación humana. El diseño de v1 lo habilita sin retrabajo:

- El staging (`filas_sync_personal`) ya es el punto natural donde insertar un **motor de reglas**
  entre "fila validada" y "escritura al expediente": hoy esa compuerta es un humano; mañana puede ser
  una política (ej. auto-confirmar cambios de bajo riesgo —teléfono, dirección—; retener para
  revisión los sensibles —salario, bancario— o los que contradicen una edición manual reciente).
- La **autoridad del dato** (§3) evolucionaría de "el último sync gana" a "manual-gana-si-fue-tocado":
  requeriría trackear por campo si hubo edición manual (columna/timestamp `*_editado_manual`). Ya hay
  trazabilidad parcial vía `eventos_auditoria` para reconstruir esto.
- No se implementa nada de esto ahora; solo se evita cerrar puertas (staging tipado, auditoría de
  sobrescrituras, casos de uso de confirmación aislados y sustituibles por una política).

---

## 9. Riesgos y decisiones abiertas

- **Estructura de `empleado_bancario` (§4.5):** bloqueada hasta ver el payload real de Iceberg.
- **Semántica de `categoria` (§4.2):** campo creado como text; valores/uso a definir con TH.
- **Resolución de `fondo/sede`:** ¿crear sede nueva si el nombre no existe, o marcar error? A cerrar
  en el plan.
- **Autoridad del dato v1:** el sync puede pisar ediciones manuales; aceptado con auditoría como
  mitigación (ver §8 para el camino a "manual gana").
- **Transporte/auth de ingesta:** fuera de esta spec; ver la de integración con Analítica de Datos.
- **Migración a producción:** requiere autorización explícita del usuario, por-migración (regla del
  repo). Verificar `list_migrations` + advisors antes/después.
```
