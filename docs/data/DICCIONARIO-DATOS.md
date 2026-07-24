# Diccionario de Datos

Basado 1:1 en [`apps/backend/src/infrastructure/db/schema.ts`](../../apps/backend/src/infrastructure/db/schema.ts)
(espejo Drizzle de las migraciones `0001`–`0018` y `0020`, que son la fuente de verdad del esquema real).
Si este documento y `schema.ts` difieren, **`schema.ts` manda** — regenerar esta tabla.

Convenciones: todos los `id` son `uuid` PK con `defaultRandom()` salvo que se indique. `created_at`/
`updated_at` son `timestamptz notNull default now()`. "deny-directo" = RLS habilitado sin políticas
(ver [ADR-0006](../architecture/adr/0006-rls-deny-directo-por-defecto.md)).

> **Pendiente — módulo Sync de Personal (migración `0019`, NO aplicada a prod):** `schema.ts` ya
> incluye los cambios del sync de Iceberg — enums `tipo_documento`/`estado_civil`/`tipo_cuenta_bancaria`/
> `origen_lote_sync`; tablas `fondos_sede`, `empleado_bancario` (placeholder), `lotes_sync_personal`,
> `filas_sync_personal`; columnas nuevas en `funcionarios`/`empleado_personales`/`empleado_salarial`/
> `empleado_familiares`. **Aún no están en producción** y `empleado_bancario` es placeholder. Se
> reflejarán 1:1 aquí cuando el módulo aterrice (Fase 7) y se aplique `0019`. Fuente interina:
> `schema.ts` + `docs/superpowers/specs/2026-07-21-sync-iceberg-hoja-vida-360-design.md`.

---

## Enums de Postgres

| Enum | Valores |
|------|---------|
| `estado_area` | PENDIENTE · APROBADO · NO_APLICA · NO_APROBADO · DEVUELTO_POR_CI |
| `estado_global` | PENDIENTE · LISTO_PARA_LIQUIDAR · LIQUIDACION_GENERADA · PAZ_Y_SALVO |
| `rol_usuario` | SUPERADMIN · TALENTO_HUMANO · CONTROL_INTERNO · AREA · SST |
| `estado_usuario` | PENDIENTE · ACTIVO · INACTIVO |
| `ambito_capacitacion` | TH · SST |
| `estado_registro_capacitacion` | BORRADOR · ABIERTO · CERRADO |
| `tipo_vinculo` | PLANTA · CONTRATISTA · EXTERNO |
| `tipo_vinculacion` | ADMINISTRATIVO · DOCENTE · OPS |
| `novedad_tipo` | CAMBIO_CARGO · EXTENSION_CONTRATO |
| `tipo_contenido_leccion` | TEXTO · VIDEO |
| `estado_capacitacion_planeada` | PLANEADA · EN_CURSO · COMPLETADA |
| `tipo_contrato` | TERMINO_FIJO · TERMINO_INDEFINIDO · OBRA_LABOR · PRESTACION_SERVICIOS |
| `modalidad` | PRESENCIAL · HIBRIDO · VIRTUAL |
| `genero` | MASCULINO · FEMENINO · OTRO |
| `parentesco` | CONYUGE · HIJO · PADRE · MADRE · OTRO |
| `nivel_formacion` | BACHILLER · TECNICO · TECNOLOGO · PROFESIONAL · ESPECIALIZACION · MAESTRIA · DOCTORADO · POSTDOCTORADO |
| `lote_estado` | CARGADO · PREVISUALIZADO · CONFIRMADO_PARCIAL · CONFIRMADO_TOTAL |
| `fila_lote_estado` | VALIDA · CON_ERROR · DUPLICADA · CONFIRMADA · DESCARTADA |
| `estado_vacante` | PENDIENTE · CONTRATADO · CANCELADA · CERRADA_PROMOCION · PAUSADA |
| `fase_vacante` | RECLUTAMIENTO · APROBACION_VICERRECTORIA · PRUEBAS_IDONEIDAD · PRUEBAS_PSICOTECNICAS · EXAMEN_MEDICO · POLIGRAFIA · CONTRATACION |
| `aprobacion_presupuesto_vacante` | SOLICITADO · EN_REVISION · APROBADO · NO_APROBADO |

---

## Núcleo — Paz y Salvo

### `areas` — dependencias que dan visto bueno (catálogo)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `nombre` | text | no | |
| `orden` | integer | no | **UNIQUE** — orden en el flujo |
| `activa` | boolean | no | default `true`; inactiva = sale del cálculo de estado (D2) |

### `funcionarios` — maestro de empleados + trámite ("una tabla, dos proyecciones", ADR-0003)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `documento` | text | no | **UNIQUE** |
| `nombre_completo` | text | no | |
| `fecha_retiro` | date | **sí** | NULL = empleado ACTIVO (sin trámite); se setea en "Finalizar contrato" |
| `area_origen` | text | no | dependencia de origen (texto libre del Excel); también poblado desde el nombre del área de Vacantes al contratar (ADR-0009) |
| `cargo` | text | no | |
| `tipo_vinculacion` | enum | sí | núcleo maestro (0009) |
| `fecha_ingreso` | date | sí | |
| `fecha_fin_contrato` | date | sí | |
| `correo_institucional` | text | sí | |
| `telefono` | text | sí | |
| `area_id` | uuid FK→areas | sí | contractual extendido (0010) |
| `tipo_contrato` | enum | sí | |
| `modalidad` | enum | sí | |
| `programa` | text | sí | |
| `escalafon` | text | sí | |
| `jefe_inmediato` | text | sí | |
| `fecha_primer_ingreso` | date | sí | |
| `observacion` | text | sí | |
| `foto_path` | text | sí | ruta en el bucket privado `fotos-empleados` |
| `estado_global` | enum | no | default `PENDIENTE` |
| `fecha_liquidacion` | timestamptz | sí | hito CI (cierre final) |
| `fecha_liquidacion_generada` | timestamptz | sí | hito TH/CI (liquidación generada) |
| `liquidacion_generada_por` | text | sí | autor del hito |
| `liquidado_por` | text | sí | autor del cierre |
| `archivado_en` | timestamptz | sí | solo asignable si `estado_global='PAZ_Y_SALVO'` (trigger 0015) |
| `created_at` / `updated_at` | timestamptz | no | |

### `aprobaciones` — estado de (área × funcionario)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `funcionario_id` | uuid FK→funcionarios | no | |
| `area_id` | uuid FK→areas | no | |
| `estado` | enum `estado_area` | no | default `PENDIENTE` |
| `updated_at` | timestamptz | no | |
| | | | **UNIQUE(funcionario_id, area_id)** |

### `observaciones` — histórico de cambios/comentarios de área (append-only)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `funcionario_id` | uuid FK→funcionarios | no | |
| `area_id` | uuid FK→areas | no | |
| `estado` | enum `estado_area` | no | |
| `texto` | text | no | |
| `autor` | text | no | |
| `created_at` | timestamptz | no | |

### `usuarios` — cuentas (id = `auth.users.id` de Supabase)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | **no** `defaultRandom` (viene de Supabase Auth) |
| `email` | text | no | **UNIQUE** |
| `nombre` | text | no | |
| `rol` | enum `rol_usuario` | no | default `AREA` |
| `area_id` | uuid FK→areas | sí | requerido solo para rol AREA activo (invariante) |
| `estado` | enum `estado_usuario` | no | default `PENDIENTE` |
| `created_at` / `updated_at` | timestamptz | no | |

---

## Capacitaciones (Formación · eventos con QR)

### `capacitaciones`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `titulo` | text | no | |
| `descripcion` | text | sí | |
| `ambito` | enum `ambito_capacitacion` | no | TH / SST |
| `lugar` / `instructor` | text | sí | |
| `inicia_en` / `termina_en` | timestamptz | no | valida `termina_en > inicia_en` |
| `horas` | numeric(5,2) | sí | |
| `token` | text | no | **UNIQUE** — enlace público de registro |
| `estado_registro` | enum | no | default `BORRADOR` |
| `creada_por` | text | sí | |
| `created_at` / `updated_at` | timestamptz | no | |

### `asistencias` — deny-directo. Identidad capturada de forma autónoma (no enlaza a `funcionarios`)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `capacitacion_id` | uuid FK→capacitaciones (cascade) | no | |
| `nombre` / `documento` | text | no | |
| `correo` / `dependencia` | text | sí | |
| `tipo_vinculo` | enum `tipo_vinculo` | no | |
| `usuario_id` | uuid FK→usuarios | sí | solo si el asistente estaba logueado |
| `registrada_en` | timestamptz | no | |
| | | | **UNIQUE(capacitacion_id, documento)** = idempotencia ante doble escaneo |

---

## Cursos (Formación · tomar por cédula, deny-directo)

### `cursos`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK · `titulo` text no · `descripcion` text sí | | |
| `ambito` | enum `ambito_capacitacion` | no | |
| `token` | text | no | **UNIQUE** — enlace público "tomar curso" |
| `estado_registro` | enum | no | default `BORRADOR` |
| `creada_por` | text | sí | |
| `created_at` / `updated_at` | timestamptz | no | |

### `curso_modulos` — orden denso por curso
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `curso_id` | uuid FK→cursos (cascade) | no | |
| `titulo` | text | no | |
| `orden` | integer | no | **UNIQUE(curso_id, orden)** |
| `created_at` / `updated_at` | timestamptz | no | |

### `curso_lecciones`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `modulo_id` | uuid FK→curso_modulos (cascade) | no | |
| `titulo` | text | no | |
| `tipo_contenido` | enum `tipo_contenido_leccion` | no | TEXTO / VIDEO |
| `contenido_texto` | text | sí | HTML de Tiptap (sanitizado server-side) |
| `url_video` | text | sí | |
| `orden` | integer | no | **UNIQUE(modulo_id, orden)** |
| `created_at` / `updated_at` | timestamptz | no | |

### `inscripciones` — idempotente por curso × documento
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `curso_id` | uuid FK→cursos (cascade) | no | |
| `documento` / `nombre` | text | no | |
| `correo` | text | sí | |
| `iniciada_en` / `ultima_actividad_en` | timestamptz | no | |
| | | | **UNIQUE(curso_id, documento)** |

### `progreso_lecciones` — existencia de fila = lección completada
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `inscripcion_id` | uuid FK→inscripciones (cascade) | no | |
| `leccion_id` | uuid FK→curso_lecciones (cascade) | no | |
| `completada_en` | timestamptz | no | |
| | | | **UNIQUE(inscripcion_id, leccion_id)** |

---

## Planificador (Formación · calendario anual, deny-directo)

### `capacitaciones_planeadas` — `area_objetivo` es texto libre (sin FK a `areas`, decisión de producto)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `titulo` | text | no | |
| `area_objetivo` | text | sí | |
| `ambito` | enum `ambito_capacitacion` | no | |
| `anio` / `mes` | integer | no | |
| `estado` | enum `estado_capacitacion_planeada` | no | default `PLANEADA` |
| `notas` / `creada_por` | text | sí | |
| `created_at` / `updated_at` | timestamptz | no | |

---

## Administración de Personal / Desvinculaciones

### `novedades` — bitácora append-only del "Otro sí" ligero (deny-directo)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `funcionario_id` | uuid FK→funcionarios (cascade) | no | |
| `tipo` | enum `novedad_tipo` | no | |
| `motivo` | text | no | |
| `valor_anterior` / `valor_nuevo` | text | sí | |
| `autor` | text | no | |
| `created_at` | timestamptz | no | |

### `eventos_auditoria` — bitácora de auditoría institucional genérica (0016, deny-directo; SELECT solo SA/CI vía `es_auditor`)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `entidad_tipo` | text | no | |
| `entidad_id` | uuid | no | |
| `accion` | text | no | |
| `actor_id` | uuid | sí | |
| `actor_nombre` | text | no | |
| `estado_anterior` / `estado_nuevo` | jsonb | sí | |
| `observacion` | text | sí | |
| `metadata` | jsonb | sí | |
| `created_at` | timestamptz | no | |

### `lotes_importacion` — importación masiva de desvinculaciones (0017, deny-directo)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `nombre_archivo` | text | no | |
| `estado` | enum `lote_estado` | no | default `CARGADO` |
| `total_filas` | integer | no | default 0 |
| `filas_confirmadas` | integer | no | default 0 |
| `creado_por` | text | no | |
| `created_at` / `updated_at` | timestamptz | no | |

### `filas_lote` — filas parseadas de un lote
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `lote_id` | uuid FK→lotes_importacion (cascade) | no | |
| `numero_fila` | integer | no | **UNIQUE(lote_id, numero_fila)** |
| `documento` / `nombre_completo` | text | no | |
| `fecha_retiro` | date | no | |
| `cargo` | text | sí | |
| `estado` | enum `fila_lote_estado` | no | |
| `mensaje_error` | text | sí | |
| `funcionario_id` | uuid FK→funcionarios | sí | poblado al confirmar la fila |

---

## Hoja de Vida 360° — tablas satélite (0010, ADR-0004)

### `empleado_personales` (1-1, PK = `funcionario_id`)
`fecha_expedicion` date · `lugar_expedicion` text · `fecha_nacimiento` date · `lugar_nacimiento` text
· `genero` enum · `direccion` text · `barrio` text · `municipio` text · `correo_personal` text ·
`updated_at` timestamptz. Todas nullable salvo la PK. FK→funcionarios (cascade).

### `empleado_familiares` (1-N)
`id` PK · `funcionario_id` FK (cascade) · `parentesco` enum no · `nombre` text no ·
`fecha_nacimiento` date sí · `genero` enum sí · `created_at`.

### `empleado_formacion` (1-N)
`id` PK · `funcionario_id` FK (cascade) · `nivel` enum `nivel_formacion` no · `titulo` text no ·
`institucion` text sí · `anio_inicio` integer sí · `anio_fin` integer sí · `created_at`.

### `empleado_experiencia` (1-N)
`id` PK · `funcionario_id` FK (cascade) · `empresa` text no · `cargo` text no · `fecha_inicio` date
sí · `fecha_fin` date sí · `descripcion` text sí · `created_at`.

### `empleado_salarial` (1-1, PK = `funcionario_id`) — **SENSIBLE: RLS estricta, solo SA/TH vía `ve_salarial()`**
`salario_basico` numeric(14,2) · `auxilio_transporte` numeric(14,2) · `promedio_devengado`
numeric(14,2) · `valor_en_letras` text · `honorarios` numeric(14,2) · `eps` text · `afp` text ·
`updated_at` timestamptz. Todas nullable (OPS usa `honorarios`; admin/docente usa salario/EPS/AFP).
FK→funcionarios (cascade).

---

## Vacantes (0020 + 0021, aplicadas a prod; con UI enrutada)

Fusión adaptada de un sistema aparte (Google Apps Script + Sheets) como módulo nativo. Solo campos
**capturados**; lo derivado (STATUS, días para vencer, avisos) se recalcula en cada lectura vía
`derivarVacante`/`evaluarFila` (`shared/src/vacantes.ts`), nunca se almacena (ADR-0005). RLS
deny-directo en las 7 tablas. La `0021` añadió el catálogo propio `vacante_areas` y repuntó
`vacantes.area_id` a él (≠ `areas`, el catálogo de paz y salvo). Al marcar una vacante `CONTRATADO`
se crea automáticamente el `funcionario` (ver ADR-0009).

### Catálogos con llave (patrón `fondos_sede`): `vacante_areas` (0021), `vacante_modalidades`, `vacante_dedicaciones`, `vacante_escalafones`, `vacante_motivos`, `vacante_fuentes`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `clave` | text | no | **UNIQUE**, `UPPER_SNAKE` — lo que el dominio compara |
| `nombre` | text | no | display |
| `activo` | boolean | no | default `true` |
| `orden` | integer | no | |

Sembrados con los valores canónicos del v1 (ver `0020_vacantes.sql` para el listado completo por tabla).

### `vacantes`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid PK | no | |
| `requerimiento` | text | no | auto — secuencia `vacantes_requerimiento_seq`, formato `REQ-000001` |
| `cargo` | text | no | |
| `posiciones` | integer | no | default `1`; check `>= 1` |
| `area_id` | uuid FK→`vacante_areas` | sí | 0021 — catálogo propio, ≠ `areas` de paz y salvo |
| `modalidad_id` / `dedicacion_id` / `escalafon_id` / `motivo_id` / `fuente_id` | uuid FK→catálogo | sí | |
| `jefe`, `reemplazo`, `nombre_nuevo` | text | sí | |
| `salario` | numeric(14,2) | sí | |
| `aprobacion` | enum `aprobacion_presupuesto_vacante` | sí | |
| `fecha_aprobacion` | date | sí | |
| `fecha_requerimiento` | date | no | base del vencimiento derivado (EDATE +1 mes) |
| `fase` | enum `fase_vacante` | no | default `RECLUTAMIENTO` |
| `estado` | enum `estado_vacante` | no | default `PENDIENTE` |
| `fecha_contratacion` | date | sí | |
| `cedula` | text | sí | check formato `^[0-9]{6,10}$` |
| `created_at`, `updated_at` | timestamptz | no | |

Índices: `estado`, `area_id`, `fecha_requerimiento`.

---

## Storage

- **Bucket `fotos-empleados`** (privado, deny-directo, 0011) — fotos del expediente. El backend
  entrega URLs firmadas de subida/lectura; nunca toca los bytes.
