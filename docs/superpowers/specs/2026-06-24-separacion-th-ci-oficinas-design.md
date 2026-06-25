# Spec 1 — Separación de Talento Humano y Control Interno en oficinas dedicadas

> Fecha: 2026-06-24 · Estado: implementado y verificado · Parte 1 de 2 (la parte 2 es el
> archivo institucional, en sesión aparte).

## Contexto

TH y CI ya son roles distintos a nivel de tipo y de **guardas de backend**: la segregación
de funciones del trámite existe y está testeada (`generarLiquidacion` = TH/SA,
`registrarLiquidacion` = CI/SA, con sus 403 cruzados). Pero en la UI **ambos miraban la
misma pantalla** `/paz-y-salvo/funcionarios` con un `?vista=th|ci` puramente cosmético: no
se sentía como dos oficinas, y CI no tenía una "casa" propia. En la institución son
dependencias diferentes; la herramienta debía reflejarlo.

Este spec separa TH/CI en **dos páginas dedicadas** (Enfoque A: "dos oficinas, dos
páginas"), reforzando que **Control Interno es quien finaliza el trámite** (estado terminal
`PAZ_Y_SALVO`). No cambia el alcance de datos: ambos roles siguen viendo todo el pipeline
(para auditar); solo cambian el foco/bandeja, la acción disponible y la URL.

## Decisiones

- Enfoque **A** (descartados B "misma página con vista" y C "datos acotados").
- **CI ve todo, TH ve todo** — separación de *funciones y experiencia*, no de datos.
- Backend **sin cambios de lógica** (ya segrega). Único test nuevo/modificado: `permisos`.
- App interna pre-lanzamiento → **sin redirects de URLs legacy** `?vista=` (YAGNI); se
  actualizan todos los productores internos de esos enlaces.

## Rutas

| Ruta | Guarda | Vista | Acción única |
|------|--------|-------|--------------|
| `/paz-y-salvo/talento-humano` (+ `:id`) | `["SUPERADMIN","TALENTO_HUMANO"]` | `th` | Generar liquidación |
| `/paz-y-salvo/control-interno` (+ `:id`) | `["SUPERADMIN","CONTROL_INTERNO"]` | `ci` | Registrar paz y salvo (cierre) |
| `/paz-y-salvo/funcionarios` (+ `:id`) | `["SUPERADMIN"]` (antes SA/TH/CI) | `todos` | — (supervisión) |

Aterrizaje: CI → `/paz-y-salvo/control-interno`; TH sigue en `/inicio` (Panel) con su
oficina en el sidebar; SA conmuta entre las tres con el `Segmented`.

## Diseño

### shared (`@pys/shared` · `src/permisos.ts`)

- `rutaInicialPorRol(CONTROL_INTERNO)` → `/paz-y-salvo/control-interno` (antes `?vista=ci`).
- **Nuevo `rutaOficinaPorRol(rol)`** — fuente única del mapeo rol→entrada del módulo
  (SA→funcionarios, TH→talento-humano, CI→control-interno, AREA→mi-area). Reutilizado por
  la web para que ningún enlace mande a un rol a una ruta ajena.
- **Eliminado `vistaEfectiva`** (huérfano: su único consumidor era `FuncionariosPage`) y su
  bloque de tests. Se conservan `VistaSupervision`, `VISTAS_SUPERVISION`, `rolPuedeVerVista`.

### apps/web

- **Nuevo `pages/funcionarios/CatalogoFuncionarios.tsx`** — extracción DRY del cuerpo del
  catálogo, parametrizado por `{ vista, basePath }`. Los hrefs de filtros/paginación usan
  `hrefCon(basePath, …)` (sin propagar `vista`); el `Segmented` (solo SA) apunta a las tres
  rutas dedicadas. Copy de CI reforzado: "Finaliza el trámite… estado terminal".
- **Tres wrappers de una línea:** `FuncionariosPage` (SA, `todos`), `TalentoHumanoPage`
  (`th`), `ControlInternoPage` (`ci`).
- **`App.tsx`** — dos rutas de oficina nuevas (cada una con hijo `:id` → `FuncionarioModal`,
  que hereda la guarda vía `Outlet`); `/paz-y-salvo/funcionarios` estrechada a `["SUPERADMIN"]`.
- **`Layout.tsx`** — sidebar TH → "Talento Humano", CI → "Control Interno" (rutas dedicadas);
  `routeLabels` con las dos rutas para el breadcrumb.
- **Panel (`ModuleLauncher`, `FlujoTramite`, `PanelControlPage`)** — el Panel lo ven SA y TH;
  como `/funcionarios` ahora es SA-only, **todos** sus enlaces a esa ruta se cambiaron a la
  oficina del rol. `PanelControlPage` calcula `oficina = rutaOficinaPorRol(rol)` una vez y la
  pasa como prop; los hijos arman `hrefCon(oficina, { estado })`. Así TH nunca cae en `/no-access`.

## Verificación

```
shared 86/86 · backend 85 + 1 skip · web typecheck limpio + 9/9 · build raíz exit 0 sin warnings
```

Smoke (con `.env`): CI aterriza en su oficina (bandeja "Esperan tu cierre", solo Registrar
paz y salvo, no ve Generar); TH en `/inicio` + sidebar "Talento Humano" (solo Generar);
`/paz-y-salvo/control-interno` da `/no-access` a TH; SA conmuta Todo/TH/CI preservando
`q`+`estado`; el modal `:id` abre/cierra en cada oficina; flujo E2E TH genera → CI cierra.
