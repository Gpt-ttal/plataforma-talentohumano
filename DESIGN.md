---
name: Sistema Paz y Salvo
description: Herramienta institucional de talento humano — navy estructural, oro reservado al hito, theming claro/oscuro.
colors:
  navy: "#142943"
  navy-deep: "#0E1F35"
  gold: "#B68D40"
  gold-light: "#E9D196"
  bg: "#F4F7FB"
  surface: "#F4F7FB"
  card: "#FEFCF8"
  surface-2: "#EEF0F5"
  elevated: "#FFFFFF"
  foreground: "#0A1830"
  muted: "#697080"
  faint: "#AEB6C6"
  border: "#E0E4EC"
  hairline: "#CCD2DE"
  plaqueta: "#785824"
  ok: "#16936A"
  ok-bg: "#E4F5EE"
  info: "#3B6FD4"
  info-bg: "#E8EFFC"
  listo: "#B68D40"
  listo-bg: "#F4E8C6"
  pendiente: "#8B93A6"
  rechazo: "#A4231F"
  rechazo-bg: "#FDE8E8"
  paz: "#1E7A52"
  paz-bg: "#E3F2EA"
typography:
  display:
    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
  data:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    fontFeature: "tabular-nums"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy-deep}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
  chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.navy}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  chip-active:
    backgroundColor: "{colors.navy-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  segmented-tab-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.navy}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  input-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 16px 10px 40px"
  card-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  pill-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
---

# Design System: Sistema Paz y Salvo

## 1. Overview

**Creative North Star: "El Sello Institucional"**

El sistema se comporta como la papelería oficial de una universidad seria: un chasis
**navy** sobrio que carga toda la estructura, y un **oro** que casi nunca aparece —
porque cuando aparece, _significa_ algo. El oro es el sello: marca la acción principal
y el hito del trámite (liquidación generada, paz y salvo registrado, curso completado).
Una superficie tranquila y legible donde el momento de validación se siente porque es raro.

Es una **herramienta diaria, no una vitrina.** La densidad sirve a la lectura: estados
legibles de un vistazo, números tabulares, hairlines de plata en vez de bordes pesados.
Desde la Sesión 27 el sistema vive en **claro y oscuro** vía tokens CSS semánticos
(`--bg`, `--card`, `--foreground`, `--estado-*`, resueltos con `rgb(var(--x) / <alpha>)`)
conmutados por una clase `.dark` en `<html>` — el navy y el oro son constantes en ambos
modos, solo cambian los neutros de fondo/texto. La identidad premium se intuye en el
oficio, no se exhibe en cada superficie; es de la institución, no del software.

Rechaza explícitamente dos extremos: el **SaaS genérico** (cards idénticas, morados y
gradientes de startup, eyebrows en mayúsculas sobre cada sección, marcadores 01/02/03)
y el **software estatal anticuado** (tablas grises sin jerarquía, formularios planos,
contraste pobre). El sistema evolucionó desde su primera versión hacia esquinas más
**estructuradas y menos "todo-pill"**: chips, buscador, segmented y avatar usan hoy
`rounded-md`/`rounded-lg` (8–12px) en vez de `rounded-full`; el óvalo pleno queda
reservado a puntos de estado, badges de una letra y el botón-pill compacto de acciones.

**Key Characteristics:**

- Navy estructural en todo; oro reservado al hito y a la acción principal (≤10% de la pantalla).
- Superficies "premium-card": `card/94%` + `backdrop-blur(10px)` + hairline + sombra ambiente de dos capas, no bordes duros.
- Filas-acordeón (`FilaDesplegable`) antes que tablas; pills de estado como única fuente de color semántico, hoy multiplicadas a 6 dominios (trámite, área, usuario, vinculación laboral, registro de capacitación, capacitación planeada) desde el mismo patrón `estado*Pill()` en `@pys/shared`.
- Números tabulares para contadores, documentos, fechas y avance.
- Serif de sistema (`.font-display`, sin fuente web) solo para wordmark y títulos de página; sans nítida para todo lo demás.
- Theming claro/oscuro con el mismo contraste AA en ambos modos; el chrome navy de la barra lateral se mantiene fijo por identidad de marca.

## 2. Colors

Una paleta institucional fría y contenida: navy + plata cargan el 90% de cualquier
pantalla, el oro entra como acento de hito, y un semáforo funcional (verde/azul/rojo)
comunica el estado del trámite. Los valores de abajo son el modo **claro** (canónico en
el frontmatter); el modo oscuro remapea los mismos roles semánticos — ver Do's and Don'ts.

### Primary
- **Navy Institucional** (#142943): marca, estructura, chasis de barra lateral/superior, texto fuerte. Su variante **Navy Deep** (#0E1F35) viste el gradiente de la nav y los chips/segmented activos.

### Secondary
- **Oro Antiguo** (#B68D40): el sello. Acción principal (`bg-gold-sheen`, gradiente #E9D196→#CBA135→#B68D40→#DAB55E), subrayado de nav activo, anillo del avatar, foco accesible, estado "Listo para liquidar"/"Planeada". Su luz **Oro Claro** (#E9D196) vive dentro del gradiente y en fondos tintados sutiles.

### Tertiary (semáforo de estado)
- **Verde Paz** (#16936A sobre #E4F5EE): aprobado / completado / paz y salvo.
- **Verde Cierre** (#1E7A52 sobre #E3F2EA): el paz y salvo como hito final, un tono más profundo que "aprobado" para marcar que es terminal.
- **Azul Liquidación** (#3B6FD4 sobre #E8EFFC): en curso, a la espera del siguiente rol (liquidación generada, capacitación en curso).
- **Plata Pendiente** (#8B93A6): pendiente, sin urgencia cromática.
- **Rojo Rechazo** (#A4231F sobre #FDE8E8): no aprobado. El único rojo del sistema; se usa con cuidado.
- **Ámbar Aviso** (#B45309 sobre #FEF3C7, tokens `--estado-aviso`/`--estado-avisoBg`, escala Tailwind `estado.aviso`/`estado.avisoBg`): advertencia **informativa** — vencimientos, avisos de vacante, KPIs de alerta. Nace para **devolver significado al oro**: lo que antes se pintaba con `gold-*` decorativo (que competía con el sello) ahora es ámbar, y el oro queda reservado a acción e hito. No es el sello ni un estado del semáforo; es el 7.º dominio semántico de color.

### Neutral
- **Ink / Foreground** (#0A1830 en claro): color de cuerpo de texto sobre superficies claras. Token semántico `--foreground`, se invierte a casi-blanco en oscuro.
- **Muted** (#697080, `--muted`): texto secundario, metadatos, placeholders. Nunca para prosa larga.
- **Hairline** (#CCD2DE, `--hairline`): bordes, divisores, la línea que separa por defecto.
- **Border** (#E0E4EC, `--border`): anillos de inputs y chips en reposo, un paso más claro que el hairline.
- **Card** (#FEFCF8, `--card`): superficie de tarjetas/filas/inputs — marfil, no blanco puro (`--elevated` #FFFFFF es el blanco puro, reservado a elevaciones fuertes como el modal).
- **Bg** (#F4F7FB, `--bg`): fondo base, perla frío y plano, con una veladura radial dorada casi imperceptible arriba-izquierda.

### Named Rules
**La Regla del Sello.** El oro cubre ≤ 10% de cualquier pantalla. Es la acción
principal y el hito — nunca relleno, nunca fondo de sección, nunca decoración. Si todo
es dorado, nada es el sello.

**La Regla del Semáforo Único.** El color semántico de un estado se define una sola vez
en `@pys/shared` (`ui.ts` del paquete compartido) y se pinta solo vía las funciones
`estado*Pill()`. Ningún componente reconstruye el color de un estado a mano. Esta regla
ya escaló a 6 dominios de estado distintos sin romperse.

## 3. Typography

**Display Font:** "Segoe UI Variable Display" (con Segoe UI, Inter, sans-serif de sistema — sin fuente web, cero dependencia de red)
**Body Font:** Sans del sistema (ui-sans-serif / system-ui / Segoe UI / Roboto)
**Data:** la misma sans con `font-variant-numeric: tabular-nums`

**Character:** un emparejamiento de contraste moderado: una "serif de sistema" con aire
editorial para los pocos momentos de marca (wordmark, título de página vía `PageHeader`,
título de empty state), y una sans neutra y nítida que carga toda la interfaz — labels,
botones, datos, cuerpo. No se mezclan dos sans; el contraste es serif-de-sistema↔sans.

### Hierarchy
- **Display** (700, 1.875rem/text-3xl, lh 1.2, tracking -0.01em): título de `PageHeader` en cada página. Raro y deliberado — una vez por pantalla.
- **Title** (600, 1rem, lh 1.3): encabezados de sección, nombre del funcionario/curso en la fila.
- **Body** (400, 0.875rem, lh 1.5): texto de interfaz, descripciones. Prosa ≤ 65–75ch.
- **Label** (600, 0.75rem): pills, chips, contadores, metadatos, botones compactos.
- **Data** (500, 0.875rem, tabular-nums): documentos, fechas, contadores, barras de progreso.

### Named Rules
**La Regla de la Serif Reservada.** `.font-display` es para wordmark y títulos de
página, jamás para labels de UI, botones ni datos. Una serif en un botón es un error.

**La Regla Tabular.** Todo número que el ojo pueda comparar en columna (documentos,
contadores, fechas, avance de progreso) usa cifras tabulares.

## 4. Elevation

Sistema **plano con elevación ambiente sutil**, servido hoy por una única clase
utilitaria: `.premium-card` (`card/94%` + `border hairline/78%` + `backdrop-filter:
blur(10px)` + sombra de dos capas). No hay bordes gruesos; la profundidad viene de esa
sombra difusa más el hairline, y el hover sube un peldaño de elevación + tiñe el borde
de oro al 24%. En oscuro las mismas clases cambian solo la opacidad/oscuridad de la
sombra (más negra, más difusa), nunca la receta.

### Shadow Vocabulary
- **Luxe** (`0 1px 2px rgba(16,28,51,.04), 0 12px 28px -14px rgba(16,28,51,.22)`): tarjetas, filas, botones secundarios, segmented, buscador en reposo.
- **Luxe-lg** (`0 2px 6px rgba(16,28,51,.05), 0 24px 48px -20px rgba(16,28,51,.30)`): hover de fila, modal de detalle.
- **Gold** (`0 8px 24px -10px rgba(182,141,64,.55)`): solo el botón primario (sello) en hover. La única sombra de color del sistema.
- **Premium-card** (propia, ver arriba): la elevación por defecto real de filas/tarjetas — más suave que Luxe, con blur.

### Named Rules
**La Regla del Hairline Primero.** La separación por defecto es una línea de plata
(`--hairline`), no una sombra. La sombra se reserva para elevación real.

## 5. Components

### Buttons
- **Shape:** `rounded-md` (8px) en botones compactos/primarios, `rounded-xl` (12px) en el secundario grande (p. ej. "Continuar con Google").
- **Primary (el sello):** fondo `bg-gold-sheen` (gradiente oro), texto `navy-900`, anillo `gold-600/30`, `shadow-sm`→`shadow-gold` en hover. Lleva un punto navy a la izquierda que crece en hover (`GenerarLiquidacionButton`/`LiquidarButton`). Es el único botón dorado de la pantalla.
- **Secondary:** superficie `card`, texto navy, borde `border`, `shadow-luxe`; hover vira el borde a oro y sube a `shadow-luxe-lg`.
- **Hover / Focus:** transición 200ms; foco visible con anillo oro (`outline: 2px solid rgba(182,141,64,.65)`), definido una vez en `index.css` para todo control interactivo.
- **Disabled:** opacidad 50–60%, `cursor-not-allowed`.

### Chips (filtro)
- **Style:** `rounded-md` (no `rounded-full`). Inactivo: `card/82%`, texto muted, anillo `border`; hover sube a `card` pleno + anillo oro-300. Activo: `navy-deep`, texto blanco, anillo `gold/45`, `shadow-luxe`.
- **Contador:** cifra tabular a la derecha — oro-200 activo, muted inactivo.

### Segmented (toggle de vista)
- **Style:** pista `border` + `card/70%`, `rounded-lg`, padding 1. La pestaña activa es `rounded-md` `card` con `shadow-luxe` + anillo `gold/35`; inactivas son texto muted que vira a foreground en hover. Server-driven — cada opción es un `Link`, nunca estado local.

### Inputs / Fields (Buscador)
- **Style:** `rounded-md`, `card/88%`, borde `border`, `shadow-luxe`, ícono de lupa muted a la izquierda, debounce 300ms escribe en `?q=`.
- **Focus:** borde y anillo viran a oro (`focus:border-gold-400 focus:ring-gold-300/45`); sin glow.
- **Placeholder:** `muted` (verificar contraste ≥4.5:1 en texto real, no solo placeholder).

### Cards / Containers (Fila desplegable)
- **Corner Style:** `rounded-xl` (12px) — no `rounded-2xl`.
- **Background:** `.premium-card` (ver Elevation); al expandir, el cuerpo revelado usa gradiente `surface-2/75%→card/70%`.
- **Border:** hairline `border-t` al expandir + `.premium-hairline` (gradiente oro→foreground→transparente) como divisor interno.
- **Disclosure:** la cabecera ES el disparador (`aria-expanded`+`aria-controls`), chevron que rota 90°; las acciones de rol viven fuera del disparador, a la derecha, nunca anidadas dentro de un botón.

### Navigation
- **Style:** barra navy (gradiente `navy-deep`, chrome fijo en ambos temas por identidad de marca), enlaces blanco/65%→blanco pleno; el activo lleva subrayado fino `gold-sheen`. Condicionada por rol y por el registro declarativo de módulos (`shared/src/modulos.ts`) — el sidebar nunca hardcodea qué módulos existen.

### Avatar (firma)
- Placa `rounded-lg` (8px, no un círculo pleno) con gradiente `navy-50→card`, iniciales navy-700, anillo `gold-200/60`. Tres tamaños (sm/md/lg).

### Estado Pill (firma)
- Pastilla `rounded-full` con punto de color + etiqueta de texto (nunca solo color). Fondo tintado del propio matiz del estado con anillo del mismo matiz. Fuente única: las funciones `estado*Pill()` de `@pys/shared`, hoy cubriendo trámite, área, usuario, vinculación laboral, registro de capacitación y capacitación planeada — el mismo patrón, 6 veces, sin excepciones.

## 6. Do's and Don'ts

### Do:
- **Do** reservar el oro al hito y a la acción principal (Regla del Sello, ≤10% de la pantalla).
- **Do** pintar todo estado vía las funciones `estado*Pill()` de `@pys/shared` — punto de color **+** etiqueta de texto, nunca solo color.
- **Do** usar cifras tabulares en documentos, contadores, fechas y barras de avance.
- **Do** separar con hairline de plata (`--hairline`) por defecto; sombra solo para elevación real.
- **Do** mantener el cuerpo de texto en `--foreground` con contraste ≥ 4.5:1; secundarios en `--muted`, nunca para prosa larga.
- **Do** reservar `.font-display` a wordmark y títulos de `PageHeader`.
- **Do** verificar cada superficie nueva en **ambos temas** (claro/oscuro) — los tokens semánticos ya resuelven esto si se usan `bg-card`/`text-foreground`/`border-border` en vez de hex o `bg-white` a mano.
- **Do** usar `rounded-md`/`rounded-lg` (8–12px) como esquina por defecto de chips, inputs, botones y tarjetas; reservar `rounded-full` a puntos de estado, badges y pills.

### Don't:
- **Don't** parecer **SaaS genérico**: nada de grids de cards idénticas, morados/gradientes de startup, eyebrows en mayúsculas sobre cada sección, ni marcadores numerados de relleno (01/02/03).
- **Don't** parecer **software estatal anticuado**: nada de tablas grises densas sin jerarquía, formularios planos sin aire, ni contraste pobre.
- **Don't** recargar de oro: nada de veladuras doradas de fondo, foil metálico en texto de UI, ni gradientes dorados fuera del botón-sello.
- **Don't** usar `background-clip: text` con gradiente para énfasis; el énfasis es por peso o tamaño, color sólido.
- **Don't** usar bordes laterales de color (`border-left` > 1px) como acento en filas o callouts.
- **Don't** poner la serif de sistema en labels, botones o datos.
- **Don't** reconstruir el color de un estado a mano en un componente; siempre desde `@pys/shared`.
- **Don't** abrir un modal como primer recurso; preferir la fila-acordeón (`FilaDesplegable`) y páginas dedicadas (`/personal/:id`, `/cursos/:id`) — el modal es profundidad puntual, no el camino por defecto.
- **Don't** hardcodear `bg-white`/hex de estado directo en un componente nuevo — usa los tokens semánticos (`bg-card`, `text-foreground`, `estado.*`) para que el modo oscuro herede gratis.
- **Don't** dejar una página nueva plana/genérica solo porque reusa `FilaDesplegable`/`ChipFiltro`/`Buscador` de forma literal — el Sello exige que cada superficie tenga *algo* propio (una franja de progreso, un ícono de dominio, jerarquía visual que refleje su propio dato), no un catálogo idéntico reetiquetado.
