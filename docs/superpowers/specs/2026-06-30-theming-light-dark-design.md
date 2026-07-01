# Sistema de theming global light/dark

## Contexto

`apps/web` debe soportar un modo light/dark global, estructurado y universal para el sistema Paz y Salvo. El modo debe depender de una sola fuente de verdad: la clase `dark` en `<html>`. La arquitectura adopta el patron ya validado en SIGAF: Tailwind con `darkMode: 'class'`, tokens CSS como RGB triplets y consumo mediante `rgb(var(--token) / <alpha-value>)`.

El sistema conserva la identidad de El Sello: navy como chasis institucional, oro como acento discreto y semaforo de estados reconocible. El objetivo no es redisenar la interfaz sino convertir las superficies existentes en theme-aware sin perder jerarquia, legibilidad ni contraste.

## Decisiones aprobadas

- Solo se implementan dos modos: `light` y `dark`.
- El modo light es el valor base; en primera visita se respeta `prefers-color-scheme`.
- Despues de que el usuario elige un modo, manda `localStorage` con clave `pys_theme`.
- Un script anti-FOUC aplica `dark` antes del primer paint.
- El toggle vive en la tarjeta de usuario del sidebar y en el header.
- Sidebar y RoleSwitcher permanecen como chrome oscuro de marca en ambos modos.
- Las superficies de pagina, tarjetas, inputs, textos, hairlines y badges pasan a tokens semanticos.
- No se toca backend, base de datos, estados de dominio ni transacciones.
- No se hacen commits salvo solicitud explicita del usuario.

## Arquitectura

### ThemeContext

Se agrega `src/context/ThemeContext.tsx` con:

- `ThemeProvider`.
- estado `tema: 'light' | 'dark'`.
- inicializacion desde `localStorage('pys_theme')` o `prefers-color-scheme`.
- efecto que sincroniza `document.documentElement.classList`.
- persistencia en `localStorage`.
- hook `useTheme()` con `{ tema, esDark, alternar }`.

El provider se monta arriba del arbol en `App.tsx`, de forma que `Layout`, `RoleSwitcher`, paginas, charts y componentes UI puedan leer el tema.

### Anti-FOUC

`apps/web/index.html` incluye un script inline en `<head>` que lee `pys_theme`, cae a `prefers-color-scheme` si no existe preferencia y aplica `document.documentElement.classList.add('dark')` antes del primer render.

### Toggle

Se agrega `src/components/ThemeToggle.tsx` con dos variantes:

- `sidebar`: boton discreto legible sobre navy, para convivir con la accion "Salir".
- `header`: pastilla compacta con borde/ring semantico para header.

El boton expone `aria-label` y `aria-pressed`, no usa emojis, y respeta `prefers-reduced-motion`.

## Tokens

`src/index.css` define una capa semantica base en `:root` y overrides en `html.dark`:

- `--bg`
- `--surface`
- `--card`
- `--surface-2`
- `--elevated`
- `--overlay`
- `--foreground`
- `--muted`
- `--faint`
- `--border`
- `--hairline`

Tambien define variables para los estados (`estado-ok`, `estado-okBg`, `estado-info`, etc.) y los colores usados por charts.

`tailwind.config.ts` activa `darkMode: 'class'` y expone colores semanticos respaldados por variables CSS. Los tokens existentes `bg`, `ink` y `estado.*` se mantienen compatibles, pero pasan a leer variables.

## Retrofit

El retrofit es mecanico y acotado:

- `bg-white` y blancos de superficie pasan a `bg-card` o `bg-elevated`.
- `bg-silver-50/100` pasan a `bg-surface-2`.
- `text-navy-900/800` pasan a `text-foreground`.
- `text-silver-600/500` pasan a `text-muted`.
- `text-silver-400/300` pasan a `text-faint`.
- `border-silver-200` pasa a `border-border`.
- `border-silver-300` y separadores pasan a `border-hairline`.
- badges neutros compartidos usan `bg-surface-2 text-muted ring-border`.

No se invierte el sidebar ni se sustituyen los acentos de marca salvo casos puntuales de contraste.

## Charts

Los charts mantienen los matices de negocio, pero los colores estructurales se derivan del tema:

- texto de ejes
- grid
- cursor
- tooltip
- barra estructural navy

La fuente del tema es `useTheme()`. Los helpers de chart pueden leer `esDark` o variables CSS, siempre que eviten duplicar constantes sueltas por componente.

## Verificacion

El gate esperado es:

```bash
npm run build --workspace=shared
npm run typecheck --workspace=apps/web
npm run test --workspace=apps/web
npm run test --workspace=shared
npm run build
```

El cambio es presentacional e infra. No se agregan tests nuevos salvo que el `ThemeContext` requiera una prueba minima de persistencia/toggle.

## Criterios de aceptacion

- El modo se decide solo por `<html class="dark">`.
- El usuario puede alternar tema desde sidebar y header.
- La preferencia persiste en `localStorage`.
- La primera visita respeta `prefers-color-scheme`.
- No hay parpadeo visible al recargar.
- Las superficies principales de app, modales, inputs, tablas, headers, paginas publicas y charts son legibles en ambos modos.
- El sidebar y RoleSwitcher conservan el lenguaje navy/oro.
- Los estados mantienen identidad cromatica y contraste.
