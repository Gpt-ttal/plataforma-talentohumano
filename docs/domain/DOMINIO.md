# Dominio y Reglas de Negocio

Fuente única de tipos: [`shared/src/domain.ts`](../../shared/src/domain.ts) (sin lógica, solo
contratos). Las reglas puras viven en `shared/src/*.ts` (`estado.ts`, `permisos.ts`, `personal.ts`,
etc.). Este documento consolida el modelo mental; el código manda si difieren.

> **En curso — Sync de Personal (Iceberg):** `domain.ts` + `sync.ts` incorporan tipos nuevos aún en
> construcción (Fases 4-7): enums `TipoDocumento`/`EstadoCivil`/`TipoCuentaBancaria`/`OrigenLoteSync`/
> `AccionDiff`, catálogo `FondoSede`, bloque `DatosBancarios` (placeholder), extensiones a
> `DatosPersonales`/`EmpleadoContractual`/`DatosSalariales`/`Familiar`/`ExpedienteCompleto`
> (+`bancario`/`bancarioVisible`), y los tipos de staging (`FilaSync`, `LoteSyncPrevisualizacion`,
> `DiffCampo`). Diseño: `docs/superpowers/specs/2026-07-21-sync-iceberg-hoja-vida-360-design.md`.

---

## 1. Roles de usuario

| Rol | Qué ve / puede hacer |
|-----|----------------------|
| `SUPERADMIN` | Todo; administra usuarios y áreas |
| `TALENTO_HUMANO` | Supervisión del avance; **valida** que todas las áreas dieron visto bueno antes del traspaso a CI; cierra oficialmente la liquidación |
| `CONTROL_INTERNO` | Revisa lo `LISTO_PARA_LIQUIDAR`; genera la liquidación; puede devolver un área a revisión |
| `AREA` | Solo la cola de su propia dependencia; da visto bueno por funcionario |
| `SST` | Módulos de Formación (Capacitaciones/Cursos/Planificador) de ámbito SST |

> **Nota sobre el relevo TH↔CI:** en la Gestión de Desvinculaciones (Sesión 47) se **invirtieron** las
> guardas: **Control Interno** valida el penúltimo hito (`generarLiquidacion`) y **Talento Humano**
> cierra oficialmente (`registrarLiquidacion`). Los nombres técnicos de los casos de uso NO cambiaron;
> solo el rol autorizado.

**Roles plataforma vs. acotados** (ver ADR-0007): `rolVePlataforma()` → SA y TH aterrizan en `/inicio`
(lanzador de módulos). CI/AREA/SST entran directo a su trabajo vía `rutaInicialPorRol`.

---

## 2. Flujo de estados del funcionario (paz y salvo)

```
PENDIENTE  →  LISTO_PARA_LIQUIDAR  →  LIQUIDACION_GENERADA  →  PAZ_Y_SALVO
   │                                          ↑
   └──── (mientras haya áreas sin aprobar) ───┘
```

**Regla (máquina de estados pura, `estado.ts` → `calcularEstadoGlobal`; ver ADR-0005):**
un área en `APROBADO` o `NO_APLICA` cuenta como "OK". Cuando todas las áreas activas están OK, el
estado global sube. `NO_APROBADO` de cualquier área lo devuelve a `PENDIENTE`. Un área
`DEVUELTO_POR_CI` también bloquea (Control Interno devolvió ese visto bueno a revisión).

### Estados de área — `EstadoArea`
`PENDIENTE` · `APROBADO` · `NO_APLICA` · `NO_APROBADO` · `DEVUELTO_POR_CI`

### Estado global — `EstadoGlobal`
`PENDIENTE` · `LISTO_PARA_LIQUIDAR` · `LIQUIDACION_GENERADA` · `PAZ_Y_SALVO`

Solo un funcionario en `PAZ_Y_SALVO` puede recibir `archivadoEn` (sello de archivado formal, con
red de seguridad por trigger en BD).

---

## 3. Ciclo de vida del usuario

```
PENDIENTE → ACTIVO → INACTIVO
```
Autoregistro (primer login Google) → SUPERADMIN asigna rol/área → activación. Un usuario de área
ACTIVO **debe** tener `areaId`; el resto de roles no llevan área (invariante en
`errorInvarianteUsuario`).

---

## 4. Empleado vs. Funcionario ("una tabla, dos proyecciones", ADR-0003)

La misma fila de `funcionarios` sirve dos proyecciones, discriminadas por `fechaRetiro`:
- **`Empleado`** (maestro) — TODAS las filas. Nace ACTIVO (`fechaRetiro === null`, sin aprobaciones,
  invisible a Paz y Salvo).
- **`Funcionario`** (trámite) — solo las de `fechaRetiro !== null`.

**"Finalizar contrato" es el puente de salida**: setea `fechaRetiro` → backfill de aprobaciones por
área activa → la misma fila entra a la máquina de estados intacta.

**Contratar una vacante es el puente de entrada**: marcar una vacante `CONTRATADO` crea el `Empleado`
ACTIVO en la misma transacción, copiando cédula/nombre/cargo/área/fecha de la vacante
([ADR-0009](../architecture/adr/0009-puente-vacante-funcionario.md)).

### Ciclo de vida de la vinculación — `EstadoVinculacion` (DERIVADO, no columna)
`ACTIVO` (sin trámite) → `EN_RETIRO` (trámite en curso) → `RETIRADO` (trámite cerrado). Función pura
en `personal.ts`.

### Naturaleza de la vinculación — `TipoVinculacion`
`ADMINISTRATIVO` · `DOCENTE` · `OPS` (discriminador, deriva de la hoja del Excel). Al contratar una
vacante se infiere de su dedicación vía `tipoVinculacionDesdeDedicacion` (docentes→`DOCENTE`; ver
ADR-0009); es nullable y Talento Humano lo corrige si hace falta.

### Novedades ("Otro sí" ligero) — `NovedadTipo`
`CAMBIO_CARGO` · `EXTENSION_CONTRATO`. Bitácora append-only; cada novedad también aplica el cambio al
empleado.

---

## 5. Hoja de Vida 360° (ver ADR-0004)

El expediente completo (`ExpedienteCompleto`) reparte los datos en bloques:
- **Contractual** (en `funcionarios`, no sensible): `TipoContrato`, `Modalidad`, programa, escalafón,
  jefe inmediato, `areaId`, foto.
- **Personales** (1-1): identidad, nacimiento, `Genero`, dirección, correo personal.
- **Familiares** (1-N): `Parentesco` (`CONYUGE`/`HIJO`/`PADRE`/`MADRE`/`OTRO`).
- **Formación** (1-N): `NivelFormacion` (`BACHILLER`…`POSTDOCTORADO`).
- **Experiencia** (1-N): empleos previos.
- **Salarial** (1-1, **SENSIBLE**): salario/honorarios/EPS/AFP. **Solo SA/TH** vía RLS + guarda de
  aplicación. `salarialVisible` distingue "restringido" (`salarial === undefined`) de "visible pero
  vacío" (`salarial === null`).

Campos derivados (edad, antigüedad, rango etario/salarial) son funciones puras, nunca columnas.

---

## 6. Entidades y tipos de lectura

- **Núcleo:** `Funcionario`, `AreaVistoBueno`, `Aprobacion`, `Observacion`, `Usuario`.
- **Detalle/UI:** `FuncionarioDetalle` (funcionario + aprobaciones + observaciones), `AprobacionConArea`.
- **Colas y matriz:** `FilaGestionArea`, `ColaGestionArea` (con conteos por `BucketGestion`:
  `pendientes`/`gestionados`/`todos`), `FilaMatriz` / `MatrizGestion` (funcionario × área activa).
- **Filtros:** `FiltroFuncionarios` (incluye `areaBloqueante` — "quién espera a X", cubre `PENDIENTE`,
  `NO_APROBADO` y `DEVUELTO_POR_CI` en un parámetro), `FiltroEmpleados`, `FiltroGestionArea`.
- **Métricas:** `MetricasDashboard` (`porEstado`, `pendientesPorArea`, `aging`).
- **Paginación:** `Pagina`, `ResultadoPaginado<T>`.

---

## 7. Módulos de la plataforma

Registro declarativo en `shared/src/modulos.ts` (ver ADR-0007). Actuales:
`paz-y-salvo` (todos) · `capacitaciones` (SA/TH/SST) · `cursos` · `planificador` · `personal` (SA/TH)
· `desvinculaciones` (importación masiva, SA/TH) · `vacantes` (seguimiento de procesos de
contratación, SA/TH). Próximos: `reportes`, `organigrama`.
