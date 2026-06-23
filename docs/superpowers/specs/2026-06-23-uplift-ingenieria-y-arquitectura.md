# Uplift de Ingeniería y Arquitectura — Sistema Paz y Salvo

**Fecha:** 2026-06-23
**Estado:** Aprobado (Fase 1 en ejecución)
**Autor:** Leonardo Reales · Corporación Universitaria Americana

## Contexto y objetivo

El proyecto ya tiene una base sólida: capas con dependencias unidireccionales
(dominio → estado → servicios → repos → actions → UI), patrón Repository real
(memoria/Supabase), máquina de estados pura con TDD, validación con Zod y
notificaciones desacopladas.

El objetivo es **subir el proyecto a nivel profesional para producción real** en
la Corporación Universitaria Americana, atacando las brechas de un sistema que
usarán Talento Humano (TH) y Control Interno (CI).

### Decisiones tomadas (brainstorming)

- **Destino:** producción en la universidad (no solo portafolio).
- **Autenticación:** Google SSO restringido al dominio `@americana.edu.co`
  (vía Supabase Auth, provider Google).
- **Auditoría:** trazabilidad básica — persistir el **usuario autenticado** +
  timestamp en cada cambio, aprovechando la tabla `Observacion` que ya guarda
  historial. Sin tabla `audit_log` separada por ahora.
- **Estrategia:** Opción A — roadmap por fases verticales, **calidad antes que
  features**. Cada fase es un PR revisable y deja el sistema desplegable.

## Arquitectura objetivo (estado final de `lib/`)

Regla de oro: **las dependencias apuntan hacia adentro**. El dominio no conoce a
nadie; la infraestructura implementa puertos definidos por la aplicación.

```
lib/
├── domain/                  # Núcleo puro. Sin I/O, sin framework, sin env.
│   ├── tipos.ts             # (antes domain.ts) tipos y contratos
│   ├── estado.ts            # máquina de estados pura (ya existe)
│   └── reglas.ts            # invariantes de negocio puras
│
├── application/             # Casos de uso. Orquesta dominio + puertos.
│   ├── services.ts          # reglas de aplicación (ya existe, se mueve)
│   ├── dto.ts               # esquemas Zod de entrada/salida (contratos de borde)
│   └── puertos.ts           # interfaces: Repo, Notificador, RelojDeSistema
│
├── infrastructure/          # Adaptadores. Implementan los puertos.
│   ├── repos/{memory,supabase}.ts
│   ├── notificaciones/      # adaptador Resend
│   └── supabase/            # cliente server
│
├── auth/                    # Sesión, RBAC, guardas de rol (Fase 2)
├── config/env.ts            # validación de entorno con Zod (Fase 1)
└── observabilidad/logger.ts # logging estructurado (Fase 4)
```

`app/` (rutas, server actions, UI) y `components/` permanecen como capa de
presentación.

**Dos principios transversales:**

1. El dominio nunca importa de `application` ni `infrastructure` (verificado con
   un test de arquitectura).
2. La seguridad se decide **en el servidor**, no en la UI: cada server action
   verifica rol antes de mutar.

---

## Fase 1 — Cimientos de calidad

Pone la red de seguridad antes de cualquier cambio riesgoso. **Cero cambios de
comportamiento.**

1. **CI/CD — GitHub Actions** (`.github/workflows/ci.yml`): en cada push/PR corre
   `typecheck → lint → test → build` en Node 20 con caché. Bloquea el merge si
   algo falla.
2. **Validación de entorno** (`lib/config/env.ts`): un único esquema Zod valida
   todas las variables al arranque, con tipos y defaults. El código importa `env`
   tipado en vez de `process.env` crudo.
3. **Formato y pre-commit:** Prettier + `.prettierrc`; Husky + lint-staged que
   corre Prettier + lint sobre archivos tocados. Pre-commit **estricto** (bloquea).
4. **README profesional:** qué es, diagrama de capas, cómo correr (memory vs
   supabase), variables de entorno, scripts, despliegue.

**Entregable:** `main` con CI verde, formato consistente, arranque validado.

---

## Fase 2 — Seguridad (Auth + RBAC)

Cierra la brecha #1: hoy los roles están simulados y la seguridad depende de la UI.

1. **Google SSO + dominio:** Supabase Auth con provider Google. En el callback y
   en middleware se verifica que el email termine en `@americana.edu.co`; se
   rechaza cualquier otro dominio.
2. **Middleware de protección** (`middleware.ts`): redirige a login si no hay
   sesión válida; protege todas las rutas salvo las públicas (login, callback).
3. **Modelo de roles:** tabla `perfiles` (user_id, email, rol) que mapea cada
   usuario autenticado a un `Rol` (ADMIN, TALENTO_HUMANO, CONTROL_INTERNO).
4. **RBAC en el servidor:** guarda `requiereRol(...)` en cada server action antes
   de mutar. `generarLiquidacion` exige TALENTO_HUMANO; `registrarLiquidacion`
   exige CONTROL_INTERNO; cambios de área según rol; ADMIN puede todo.
5. **RLS en Supabase:** políticas que permiten lectura/escritura solo a usuarios
   autenticados, y restringen los hitos (generar/registrar) por rol.
6. **Identidad real en `autor`:** el campo deja de ser texto libre y pasa a ser la
   identidad del usuario autenticado (email), tomada de la sesión en el servidor.

**Entregable:** nadie sin sesión institucional entra; las transiciones críticas
están protegidas por rol tanto en la app como en la base de datos.

---

## Fase 3 — Confianza (tests)

Eleva la cobertura de la red de seguridad más allá de la máquina de estados.

1. **Tests de `services.ts`** (reglas de aplicación): validaciones Zod,
   observación obligatoria al rechazar/devolver, gates de estado de los hitos
   TH→CI. Usando `memoryRepo`.
2. **Tests del `memoryRepo`:** que `cambiarEstadoArea` recalcule el estado global,
   limpie los hitos cuando un área regresa a pendiente, y persista observaciones.
3. **Test de integración del flujo completo:** crear funcionario → aprobar todas
   las áreas → LISTO_PARA_LIQUIDAR → generar (LIQUIDACION_GENERADA) → registrar
   (PAZ_Y_SALVO), más los caminos de rechazo y reinicio.
4. **Test de arquitectura:** verifica que el dominio no importe de `application`
   ni `infrastructure`.

**Entregable:** las reglas de negocio quedan blindadas; refactors futuros son
seguros.

---

## Fase 4 — Estructura + observabilidad

Materializa la arquitectura objetivo y profesionaliza el diagnóstico en producción.

1. **Reorganización de `lib/`** a `domain/application/infrastructure` según la
   estructura objetivo, actualizando imports vía paths de `tsconfig`. Hecho al
   final, con CI + tests ya protegiendo el movimiento.
2. **Logger estructurado** (`lib/observabilidad/logger.ts`): logs JSON con nivel y
   contexto; reemplaza los `console.*` dispersos.
3. **Manejo de errores centralizado:** jerarquía de errores de dominio y su mapeo
   consistente a `ActionResult` en las server actions.
4. **ADRs** (`docs/adr/`): registrar decisiones clave (patrón Repository, auth con
   Supabase, capas y dependencias).

**Entregable:** estructura limpia y verificable, y observabilidad lista para
operar el sistema en producción.

---

## Fuera de alcance (YAGNI por ahora)

- Tabla de auditoría inmutable separada (se eligió trazabilidad básica).
- Multi-tenant / múltiples instituciones.
- Internacionalización.
- Notificaciones por canales distintos al correo.

## Criterio de "hecho" global

- `main` siempre verde en CI (typecheck, lint, test, build).
- Acceso solo con cuenta `@americana.edu.co`; transiciones críticas protegidas por
  rol en app y base de datos.
- Reglas de negocio cubiertas por tests; flujo TH→CI probado de extremo a extremo.
- `lib/` organizado en capas con dependencias hacia adentro (verificado por test).
- README + ADRs que permiten a otro ingeniero entender y operar el sistema.
