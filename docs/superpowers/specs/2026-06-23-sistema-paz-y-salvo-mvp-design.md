# Sistema Paz y Salvo v2 — Diseño del MVP

- **Fecha:** 2026-06-23
- **Autor:** Leonardo Reales (leonardoreales@americana.edu.co) + Claude
- **Estado:** Aprobado para implementación
- **Reemplaza a:** Proyecto original en Google Apps Script (`C:\Users\Leonardo\Paz y salvo`)

---

## 1. Contexto y objetivo

La Corporación Universitaria Americana necesita gestionar el **Paz y Salvo** de los
funcionarios que se retiran. Cuando un funcionario sale, varias dependencias
("áreas de visto bueno") deben dar su concepto antes de que la persona quede a paz y
salvo y se pueda liquidar.

Existe un sistema previo construido en Google Apps Script + Google Sheets. Este
proyecto lo **reemplaza** con una aplicación web moderna e independiente de Google.

**Naturaleza del proyecto:** es a la vez una **demo oficial** y el inicio del
**reemplazo real en producción**. La arquitectura debe ser seria desde el día uno
porque, tras la primera demostración, se esperan avances inmediatos e incluso una
posible entrega temprana.

### Alcance de la PRIMERA demo (este MVP)

Incluye:

- **Corazón del sistema:** funcionarios + aprobación por áreas + estado global
  automático (máquina de estados) + historial de observaciones.
- **Dashboard de métricas** (semáforos ejecutivos).

NO incluye en esta primera iteración (ver Roadmap, sección 8):

- Autenticación real / roles / permisos → un solo usuario "todopoderoso" por ahora.
- Generación del Acta en PDF.
- Notificaciones por correo.

La arquitectura se construye de forma que estas piezas se enchufen después **sin
reescribir** el núcleo.

---

## 2. Fuente de datos base (Excel real)

Archivo: `C:\Users\Leonardo\Documents\Utilizar esta base para crear esquema, columnas (por áreas) y demás..xlsx`

Es el **listado real de funcionarios en retiro**. Define las columnas base que se
muestran en la interfaz:

| Columna Excel    | Campo del modelo  | Notas                                              |
| ---------------- | ----------------- | -------------------------------------------------- |
| Documento        | `documento`       | Cédula. String (puede tener ceros a la izquierda). |
| Nombre Completo  | `nombre_completo` | Formato "APELLIDOS NOMBRES".                        |
| Fecha de Retiro  | `fecha_retiro`    | Fecha (date).                                      |
| AREA             | `area_origen`     | Departamento de **origen** del funcionario.        |
| CARGO            | `cargo`           | Cargo del funcionario. (Nuevo respecto al sistema viejo.) |

**Datos a normalizar al importar:** espacios duros (` `), espacios sobrantes al
inicio/fin, y tildes/Ñ (vienen correctas en UTF-8, pero se valida).

### Distinción crítica: dos conceptos de "área"

1. **AREA de origen** (`area_origen`, viene del Excel): es un **atributo** del
   funcionario (su departamento). Solo se muestra como dato. Valores observados:
   `MERCADEO Y COMUNICACIONES`, `INFRAESTRUCTURA`, `CARTERA`,
   `ADMISIONES, REGISTRO Y CONTROL`.

2. **Áreas de visto bueno** (las "columnas por áreas"): son las **dependencias que
   deben aprobar** el paz y salvo. NO vienen del Excel; provienen del sistema viejo.
   Cada una marca un estado por funcionario.

### Datos semilla (seed) del MVP

- **9 funcionarios** reales del Excel.
- **10 áreas de visto bueno** (confirmadas con el usuario): `Activos fijos`,
  `Sistemas de información`, `Iceberg`, `Sinu`, `Eva`, `Tesorería`, `Contabilidad`,
  `Carnetización`, `Biblioteca`, `Inhabilitar correos`.

Las 10 áreas se modelan como **tabla configurable** (se pueden editar a futuro), pero
el seed arranca con estas.

---

## 3. Modelo de datos (PostgreSQL / Supabase)

### Enums

- `estado_area`: `PENDIENTE` · `APROBADO` · `NO_APLICA` · `NO_APROBADO`
- `estado_global`: `PENDIENTE` · `LISTO_PARA_LIQUIDAR` · `PAZ_Y_SALVO`

### Tablas

**`areas_visto_bueno`** — catálogo configurable de dependencias que aprueban.

| Campo  | Tipo    | Notas                                   |
| ------ | ------- | --------------------------------------- |
| id     | uuid PK | `gen_random_uuid()`                     |
| nombre | text    | Único. Ej: "Tesorería".                 |
| orden  | int     | Orden de presentación en la grilla.     |
| activa | bool    | Default true. Áreas activas se aplican. |

**`funcionarios`** — personas en proceso de retiro.

| Campo             | Tipo            | Notas                                    |
| ----------------- | --------------- | ---------------------------------------- |
| id                | uuid PK         |                                          |
| documento         | text            | Único. Cédula.                           |
| nombre_completo   | text            |                                          |
| fecha_retiro      | date            |                                          |
| area_origen       | text            | Departamento de origen (del Excel).      |
| cargo             | text            |                                          |
| estado_global     | estado_global   | Calculado por la máquina de estados.     |
| fecha_liquidacion | timestamptz null| Se setea al "Registrar liquidación".     |
| created_at        | timestamptz     | Default now().                           |
| updated_at        | timestamptz     | Default now().                           |

**`aprobaciones`** — una fila por (funcionario × área).

| Campo          | Tipo        | Notas                                          |
| -------------- | ----------- | ---------------------------------------------- |
| id             | uuid PK     |                                                |
| funcionario_id | uuid FK     | → funcionarios.id (ON DELETE CASCADE)          |
| area_id        | uuid FK     | → areas_visto_bueno.id                          |
| estado         | estado_area | Default `PENDIENTE`.                            |
| updated_at     | timestamptz | Default now().                                  |
|                |             | `UNIQUE(funcionario_id, area_id)`               |

Al crear un funcionario se generan automáticamente sus filas de aprobación en
`PENDIENTE`, una por cada área activa.

**`observaciones`** — historial (log) de cambios/comentarios por área.

| Campo          | Tipo        | Notas                                        |
| -------------- | ----------- | -------------------------------------------- |
| id             | uuid PK     |                                              |
| funcionario_id | uuid FK     |                                              |
| area_id        | uuid FK     |                                              |
| estado         | estado_area | Estado registrado en ese momento.            |
| texto          | text        | Comentario.                                  |
| autor          | text        | Por ahora "demo"; en fase 2 será el usuario. |
| created_at     | timestamptz | Default now().                               |

---

## 4. Máquina de estados (núcleo)

Función **pura** de TypeScript en `lib/estado.ts`, construida con **TDD (tests
primero)**. No accede a la base de datos: recibe datos y devuelve el estado.

**Entrada:** lista de estados de las áreas activas del funcionario + flag `liquidado`
(derivado de `fecha_liquidacion != null`).

**Reglas:**

```
hayRechazo = alguna área == NO_APROBADO
todasOk    = todas las áreas ∈ {APROBADO, NO_APLICA}

todasOk  &&  liquidado   →  PAZ_Y_SALVO          (verde)
todasOk  && !liquidado   →  LISTO_PARA_LIQUIDAR  (morado)
en otro caso             →  PENDIENTE            (gris; rojo en UI si hayRechazo)
```

Notas:

- A diferencia del sistema viejo, las 10 áreas NO incluyen una columna "Talento
  Humano", así que **no hay exclusión de deadlock que manejar**. El gatillo final es
  exclusivamente la acción "Registrar liquidación".
- La función expone también `hayRechazo` para que la UI pueda mostrar un indicador
  rojo aunque el estado global sea `PENDIENTE`.

**Dónde se ejecuta:** en el servidor (server action), cada vez que cambia un área o se
registra la liquidación. El resultado se persiste en `funcionarios.estado_global`.

---

## 5. Capa de aplicación (server actions)

Todas las mutaciones pasan por server actions de Next.js que usan una **capa de
repositorio** sobre Supabase. Acciones del MVP:

- `listarFuncionarios({ busqueda, filtroEstado })` → lista para la tabla.
- `obtenerFuncionario(id)` → detalle + áreas + observaciones.
- `cambiarEstadoArea({ funcionarioId, areaId, estado, observacion? })` →
  valida, escribe la aprobación, registra observación si viene, **recalcula estado
  global**, persiste.
  - Regla heredada del sistema viejo: estados `PENDIENTE` y `NO_APROBADO` **exigen**
    observación.
- `registrarLiquidacion({ funcionarioId })` → setea `fecha_liquidacion`, recalcula
  estado global (→ `PAZ_Y_SALVO` si las áreas están OK).
- `obtenerMetricasDashboard()` → agregados para el dashboard.

---

## 6. Pantallas (UI)

Branding institucional: azul `#1565C0`, verde paz y salvo `#2E7D32`, morado listo para
liquidar `#E1BEE7` / acento `#8E24AA`.

1. **Dashboard** (`/`) — semáforos ejecutivos:
   - Total de funcionarios y distribución por estado global.
   - **Pendientes por cada una de las 10 áreas** (barras/conteo).
   - Antigüedad/aging: días respecto a la fecha de retiro (atrasados, próximos, etc.).

2. **Lista de funcionarios** (`/funcionarios`) — tabla con
   `Documento · Nombre Completo · Fecha Retiro · AREA · CARGO · Estado` (badge de
   color). Búsqueda por nombre/documento + filtro por estado global. Click → detalle.

3. **Detalle del funcionario** (`/funcionarios/[id]`) — datos base + grilla de las 10
   áreas (cada una con dropdown de estado + campo de observación), historial de
   observaciones por área, y botón **"Registrar liquidación"** (gatillo final). El
   estado global se refleja en vivo con su semáforo.

---

## 7. Stack, arquitectura técnica y estructura

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS**. Despliegue en **Vercel**.
- **Supabase**: PostgreSQL + migraciones SQL versionadas + Auth/Storage ya provisionados
  para fases futuras (no usados en fase 1).
- **Acceso a datos:** server actions + capa de repositorio sobre `supabase-js`, con
  tipos generados de la base.
- **Tests:** **Vitest** para la máquina de estados (pura) y la lógica de las acciones
  clave.
- **Configuración:** variables en `.env.local` (URL y llaves de Supabase). El proyecto
  Supabase lo crea el usuario; se documentan los pasos.

### Estructura de carpetas (objetivo)

```
SISTEMA PAZ Y SALVO/
  app/
    layout.tsx
    page.tsx                  # dashboard
    funcionarios/
      page.tsx                # lista
      [id]/page.tsx           # detalle
  components/                 # UI reutilizable (badges, grilla de áreas, etc.)
  lib/
    estado.ts                 # máquina de estados (pura, testeada)
    repos/                    # capa de repositorio (Supabase)
    supabase/                 # cliente + tipos generados
  supabase/
    migrations/               # SQL versionado (enums + tablas)
    seed.sql                  # 10 áreas + 9 funcionarios del Excel
  tests/
    estado.test.ts            # TDD del núcleo
  docs/superpowers/specs/     # este documento
```

---

## 8. Roadmap (post-MVP) — arquitectura ya preparada

| Fase | Entregable                          | Notas de enganche                                                   |
| ---- | ----------------------------------- | ------------------------------------------------------------------- |
| 2    | Login Google + roles/permisos       | Supabase Auth restringido a `@americana.edu.co`. La identidad reemplaza al usuario único; los permisos por área se aplican sobre `cambiarEstadoArea`. Modelo ya contempla responsables por área. |
| 3    | Acta de Paz y Salvo en PDF          | Generación server-side, guardada en Supabase Storage. Reemplaza el Google Docs original. La acción de liquidación dispara la generación. |
| 4    | Notificaciones / digest de pendientes | Equivalente a `MailDigest`. Job programado + email a responsables. |
| 5    | Multi-periodo / multi-hoja          | Equivalente a las múltiples hojas del sistema viejo.                |

---

## 9. Criterios de éxito del MVP

1. Se ven los **9 funcionarios reales** del Excel en la lista, con sus columnas.
2. En el detalle, cambiar estados de áreas recalcula el **estado global** correctamente
   según la máquina de estados (verificado con tests).
3. El flujo completo `PENDIENTE → LISTO PARA LIQUIDAR → PAZ Y SALVO` es demostrable
   end-to-end (incluido el botón de liquidación).
4. El **dashboard** muestra métricas reales derivadas de los datos.
5. Estados `PENDIENTE`/`NO_APROBADO` exigen observación, y el **historial** queda
   registrado.
6. La app corre en local y es desplegable a Vercel + Supabase.
