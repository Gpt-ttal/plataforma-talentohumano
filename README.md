# Sistema Paz y Salvo

Herramienta interna de la **Corporación Universitaria Americana** que digitaliza el trámite de
paz y salvo cuando un funcionario se retira de la institución: cada área competente da (o no) su
visto bueno → Talento Humano genera la liquidación cuando todo está listo → Control Interno
registra el paz y salvo final. Ha crecido hasta ser una **plataforma de Talento Humano** con
módulos adicionales (Capacitaciones, Cursos, Planificador, Administración de Personal /
Hoja de Vida 360°, Gestión de Desvinculaciones).

## Quickstart

```bash
npm install

# Variables de entorno (ver docs/architecture/ARCHITECTURE.md § Modo demo vs producción)
cp apps/backend/.env.example apps/backend/.env       # DATABASE_URL, SUPABASE_JWT_SECRET, ...
cp apps/web/.env.example apps/web/.env.local          # VITE_SUPABASE_URL, VITE_API_URL, ...

npm run build --workspace=shared   # SIEMPRE primero: los otros workspaces consumen su dist/
npm run dev                        # backend :3000 (OAuth atado a este puerto) + frontend :5173
```

> El `.env.local.example` en la raíz es un remanente de la arquitectura Next.js anterior
> (referencia `DATA_SOURCE=memory`, que ya no existe en el código). La guía vigente es
> `.env.example` en la raíz + los `.env.example` de `apps/backend` y `apps/web`.

## Comandos clave

```bash
npm run test --workspace=shared            # dominio puro
npm run test --workspace=apps/backend      # casos de uso + HTTP
npm run test --workspace=apps/web          # componentes + hooks
npm test                                   # raíz: encadena los 3 workspaces

npm run typecheck --workspace=apps/web     # tsc --noEmit
npx tsc --noEmit --project apps/backend    # backend no tiene script `typecheck` propio

npm run build                              # producción: shared → backend → web
npm run format                             # prettier --write .
```

Detalle completo, con cómo correr un solo archivo de test: `docs/architecture/ARCHITECTURE.md`.

## Dónde vive cada cosa

| Necesitas... | Ve a... |
|---|---|
| Reglas de trabajo para Claude/agentes, estado actual, constraint de commits | [`CLAUDE.md`](CLAUDE.md) |
| Producto: misión, roles, personalidad de marca | [`PRODUCT.md`](PRODUCT.md) |
| Sistema visual: paleta, tipografía, reglas irrompibles | [`DESIGN.md`](DESIGN.md) |
| Arquitectura técnica: stack, mapa de archivos, patrones | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| Por qué se tomó una decisión de arquitectura (no el qué, el por qué) | [`docs/architecture/adr/`](docs/architecture/adr/) |
| Dominio: roles, flujo de estados, tipos clave | [`docs/domain/DOMINIO.md`](docs/domain/DOMINIO.md) |
| Esquema real de la base de datos, tabla por tabla | [`docs/data/DICCIONARIO-DATOS.md`](docs/data/DICCIONARIO-DATOS.md) |
| Estado actual por feature (qué es verdad hoy) | [`docs/historico/PROGRESO.md`](docs/historico/PROGRESO.md) |
| Historial completo de sesiones de desarrollo (append-only) | [`docs/historico/LOG-DE-SESIONES.md`](docs/historico/LOG-DE-SESIONES.md) |
| Specs de diseño de features grandes | [`docs/superpowers/specs/`](docs/superpowers/specs/) |

## Infraestructura

Supabase (PostgreSQL) + Vercel. Project ref y detalles operativos (sin secretos) en
`CLAUDE.md` § Infraestructura.
