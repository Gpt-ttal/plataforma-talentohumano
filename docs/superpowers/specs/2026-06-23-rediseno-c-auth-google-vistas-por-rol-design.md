# Rediseño "C" + Auth Google + vistas por rol — Diseño

- **Fecha:** 2026-06-23
- **Autor:** Leonardo Reales (leonardoreales@americana.edu.co) + Claude
- **Estado:** Aprobado para implementación
- **Amplía a:** `2026-06-23-sistema-paz-y-salvo-mvp-design.md` y
  `2026-06-23-rol-th-control-interno-y-modal-design.md`

---

## 1. Objetivo

Llevar el Sistema Paz y Salvo a un **rediseño visual mayor** en la dirección
*Modern Product* ("C mejorada"), e introducir **autenticación real con Google** y
**vistas acotadas por rol**. Cada persona entra con su cuenta institucional y cae
**directo y solo** a lo que le corresponde: el usuario de un área ve únicamente la
bandeja de su área; Talento Humano y Control Interno sus flujos; el superadmin lo ve
todo y administra usuarios. La validez de cada acción la sigue garantizando el
servidor (máquina de estados + guardas), no la UI.

## 2. Dirección visual — "C mejorada" (Modern Product)

Evoluciona el sistema actual conservando navy+oro como ancla de marca y sumando un
color de apoyo funcional. Menos "lujo recargado", más herramienta diaria nítida.

### Paleta

| Token | Hex | Uso |
| --- | --- | --- |
| `navy` | `#142943` | Marca, estructura, texto fuerte. |
| `gold` | `#b68d40` | Acento premium, acción principal, estado "Listo". |
| `ok` (verde) | `#16936a` | Aprobado / Paz y salvo. |
| `info` (azul) | `#3b6fd4` | Liquidación generada. |
| `slate` | `#475569` | Texto secundario. |
| `bg` | `#f4f7fb` | Fondos de superficie. |
| `rechazo` | `#d14343` | No aprobado (ya existe). |

### Tipografía y forma

- **Serif editorial** (`.font-display`) se reserva para wordmark y titulares grandes.
  El resto pasa a **sans nítida** con **números tabulares grandes** para jerarquía.
- Radios 14–18px, sombras sutiles, densidad mayor, foco accesible (anillo oro actual).
- El fondo con veladuras se simplifica hacia un `bg` plano/limpio coherente con C.

### Componentes reutilizables (nuevos o refactor)

`Segmented` (toggle de vistas) · `FilaDesplegable`/`Acordeon` · `Paginacion` ·
`Buscador` · `ChipFiltro` · `Avatar` (iniciales) · `EstadoPill` (centralizado en
`lib/ui.ts`, fuente única de pintado) · `EmptyState`. `Badges`/`ui.ts` siguen siendo
la fuente única del color de cada estado, así se pinta solo en lista, detalle, modal,
dashboard y bandejas.

## 3. Autenticación (Supabase Auth + Google)

- **Proveedor:** Google OAuth vía **Supabase Auth**. La app ya usa Supabase, así que
  reaprovecha cliente/SSR (`lib/supabase/`).
- **Dominio permitido:** solo correos **`@americana.edu.co`** (default). Un correo
  fuera del dominio se rechaza en el callback de auth.
- **Sesión:** cookie SSR de Supabase; helpers de servidor para leer la sesión y el
  perfil (`usuarios`) en Server Components y Server Actions.
- **Bootstrap superadmin:** el email **`leonardoreales@americana.edu.co`** se siembra
  como `SUPERADMIN/ACTIVO`. Configurable por env `SUPERADMIN_EMAIL`.

## 4. Modelo de datos — tabla `usuarios`

Nueva entidad de identidad/autorización, separada del dominio de paz y salvo:

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | uuid (= auth.uid) | Coincide con el usuario de Supabase Auth. |
| `email` | text unique | Correo institucional. |
| `nombre` | text | Nombre mostrado (de Google). |
| `rol` | enum `rol_usuario` | `SUPERADMIN \| TALENTO_HUMANO \| CONTROL_INTERNO \| AREA`. |
| `area_id` | uuid null (FK áreas) | Obligatorio si `rol = AREA`; null en los demás. |
| `estado` | enum `estado_usuario` | `PENDIENTE \| ACTIVO \| INACTIVO`. |
| `created_at` / `updated_at` | timestamptz | Auditoría. |

- **Autoregistro:** al primer login válido sin fila, se crea `usuarios` con
  `estado=PENDIENTE`, `rol` provisional sin área. El usuario ve la pantalla
  "pendiente de asignación" y no accede a datos.
- **Invariante:** `rol = AREA ⇒ area_id != null`; `rol != AREA ⇒ area_id = null`
  (validado en servicio y por `CHECK` en Supabase).
- **Tipo en dominio:** se actualiza `Rol` en `lib/domain.ts` al nuevo conjunto
  (`SUPERADMIN | TALENTO_HUMANO | CONTROL_INTERNO | AREA`), reemplazando el `ADMIN`
  simulado actual. La lógica de estado (`lib/estado.ts`) **no cambia**.

## 5. Autorización (servidor primero)

Tres capas, de fuera hacia dentro:

1. **Middleware** (`middleware.ts`): exige sesión; sin sesión → `/login`. Refresca
   la cookie de Supabase.
2. **Guardas por vista/acción:** un helper `requireUsuario(rolesPermitidos)` se usa en
   cada Server Component protegido y en cada Server Action. Para acciones de área,
   verifica además que `usuario.area_id === areaId` del request (un área no puede
   tocar otra). TH/CI/superadmin según corresponda.
3. **RLS en Supabase:** políticas que reflejan lo anterior como segunda barrera
   (defensa en profundidad), de modo que aunque se filtre una query, la fila no se
   expone/edita fuera de permiso.

La UI nunca es la fuente de verdad de permisos: solo muestra/oculta lo que ya está
garantizado en el servidor.

## 6. Enrutamiento por rol (a dónde cae cada quien)

| Rol | Aterriza en | Alcance |
| --- | --- | --- |
| **AREA** | `/mi-area` | **Solo** su bandeja: catálogo paginado de funcionarios pendientes de su visto bueno, con `AccionesArea` (Aprobar / No aplica / Rechazar / Devolver). No ve dashboard, otras áreas ni gestión. |
| **TALENTO_HUMANO** | `/funcionarios?vista=th` | Catálogo completo + "Generar liquidación" en filas `LISTO_PARA_LIQUIDAR`. |
| **CONTROL_INTERNO** | `/funcionarios?vista=ci` | Catálogo completo + bandeja destacada `LIQUIDACION_GENERADA` + "Registrar paz y salvo". |
| **SUPERADMIN** | `/` (Dashboard) | Todo. Toggle `Todo · TH · CI` **+ selector de Áreas** (inspecciona la bandeja de cualquier área). Único con `/usuarios`. |
| **PENDIENTE** (estado) | `/pendiente` | Pantalla "tu cuenta está pendiente de asignación". Sin datos. |

`Nav`/`SelectorVista` se condicionan al rol: el usuario de área no ve navegación de
supervisión; el superadmin ve el set completo.

## 7. Funcionarios — catálogo paginado con filas desplegables

Pantalla principal de supervisión (validada en mockup):

- **Segmented toggle** de vista arriba (`Todo · Talento Humano · Control Interno`,
  con contadores). Para superadmin se añade selector/segmento de **Áreas**.
- **Buscador** (nombre, documento, cargo) + **chips de filtro** por estado global.
- **Catálogo**: cada funcionario es una **fila acordeón**. Cerrada muestra avatar,
  nombre, cargo/retiro y su `EstadoPill`. Abierta despliega en línea sus áreas con el
  visto bueno de cada una, una mini-barra de progreso, y las **acciones correctas
  según rol+estado** (Generar liquidación / Registrar paz y salvo / gestionar área).
- **Paginación** al pie (servidor: `page`/`pageSize`).
- **Detalle completo** sigue disponible como **modal interceptado** y como página
  `/funcionarios/[id]` (se conservan los hitos, autor/fecha e historial de
  observaciones). El acordeón es vista rápida; el modal/página es profundidad.

## 8. Vista de área — `/mi-area`

- Reusa el **mismo catálogo desplegable** filtrado al `area_id` del usuario, con
  datos de `listarGestionArea(areaId)` (ya existe). Cada fila trae la botonera
  `AccionesArea` para fijar el visto bueno de **esa** área.
- Encabezado claro: "Bandeja de **Contabilidad**" + contador de pendientes.
- Sin toggle de vistas ni acceso a otras áreas; el servidor fuerza el `area_id`.

## 9. Gestión de usuarios — `/usuarios` (solo superadmin)

- Catálogo (mismo lenguaje: filas desplegables) de `usuarios` con rol/área/estado.
- Acción **asignar rol + área** a los `PENDIENTE` (resuelve el autoregistro) y
  activar/inactivar. Validación del invariante `AREA ⇔ area_id`.
- Servicios `listarUsuarios`, `asignarRolUsuario`, `cambiarEstadoUsuario`, con guarda
  `requireUsuario(["SUPERADMIN"])`.

## 10. Archivos (previsión)

Auth/identidad: `lib/supabase/*` (server/client/middleware) · `middleware.ts` ·
`lib/auth.ts` (`requireUsuario`, lectura de perfil) · `lib/domain.ts` (nuevo `Rol`) ·
`lib/repos/types.ts` + `memory.ts` + `supabase.ts` (CRUD `usuarios`) · `lib/seed.ts`
(superadmin semilla) · `app/login/page.tsx` · `app/auth/callback/route.ts` ·
`app/pendiente/page.tsx`.
Diseño/UI base: `tailwind.config.ts` · `app/globals.css` · `lib/ui.ts` ·
`components/Segmented.tsx` · `FilaDesplegable.tsx` · `Paginacion.tsx` ·
`Buscador.tsx` · `ChipFiltro.tsx` · `Avatar.tsx` · `EmptyState.tsx`.
Vistas: `app/page.tsx` (dashboard) · `app/funcionarios/page.tsx` (catálogo) ·
`app/mi-area/page.tsx` · `app/usuarios/page.tsx` · `components/Nav.tsx` +
`SelectorVista.tsx` (condicionados a rol) · `app/actions.ts` (guardas en acciones).
Infra: `supabase/migrations/0003_usuarios_y_roles.sql` · políticas RLS ·
`.env.example` (`SUPERADMIN_EMAIL`, claves de Google/Supabase Auth).

## 11. Fases de implementación

1. **Auth foundation** — Supabase Auth Google, tabla `usuarios` + migración + RLS,
   `middleware.ts`, `requireUsuario`, login/callback/pendiente, bootstrap superadmin,
   nuevo `Rol` en dominio. Reemplaza el `?rol=` simulado por sesión real.
2. **Sistema visual C** — tokens en `tailwind.config.ts`/`globals.css`/`ui.ts` y
   componentes base (Segmented, FilaDesplegable, Paginacion, EstadoPill, etc.).
3. **Vistas por rol** — catálogo desplegable + paginación en `/funcionarios`,
   `/mi-area`, enrutamiento por rol, `/usuarios`, Nav/SelectorVista condicionados.

Cada fase mantiene la app funcional (la demo en memoria sigue corriendo sin secretos;
cuando faltan claves de Google, el login real se desactiva con un aviso claro).

## 12. Fuera de alcance

- Acta PDF (fase posterior).
- Envío real de correo: queda en modo log hasta configurar `RESEND_API_KEY`.
- Permisos más finos que rol+área (p. ej. múltiples áreas por usuario, delegaciones).
- Internacionalización y temas claro/oscuro conmutables (C arranca en claro).