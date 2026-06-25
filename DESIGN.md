---
name: Sistema Paz y Salvo
description: Herramienta institucional de paz y salvo — navy estructural, oro reservado al hito.
colors:
  navy: "#142943"
  navy-deep: "#0E1F35"
  gold: "#B68D40"
  gold-light: "#E9D196"
  ink: "#16202E"
  silver-text: "#8B93A6"
  silver-hairline: "#CCD2DE"
  silver-track: "#EEF0F5"
  surface: "#FFFFFF"
  bg: "#F4F7FB"
  ok: "#16936A"
  ok-bg: "#E4F5EE"
  info: "#3B6FD4"
  info-bg: "#E8EFFC"
  listo: "#B68D40"
  listo-bg: "#F4E8C6"
  pendiente: "#8B93A6"
  rechazo: "#A4231F"
typography:
  display:
    fontFamily: "'Hoefler Text', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, Cambria, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.1
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
    fontWeight: 500
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  chip-active:
    backgroundColor: "{colors.navy-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  segmented-tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
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
y el hito del trámite (la liquidación generada, el paz y salvo registrado). Una
superficie tranquila y legible donde el momento de validación se siente porque es raro.

Es una **herramienta diaria, no una vitrina.** La densidad sirve a la lectura: estados
legibles de un vistazo, números tabulares, hairlines de plata en vez de bordes pesados.
La identidad premium (navy + oro antiguo, serif editorial para el wordmark) se intuye
en el oficio, no se exhibe en cada superficie. La marca es de la institución, no del
software.

Rechaza explícitamente dos extremos: el **SaaS genérico** (cards idénticas, morados y
gradientes de startup, eyebrows en mayúsculas sobre cada sección) y el **software
estatal anticuado** (tablas grises sin jerarquía, formularios planos, contraste pobre).
También se baja el "lujo recargado" del sistema previo —menos veladuras y foil
metálico— sin perder la identidad.

**Key Characteristics:**

- Navy estructural en todo; oro reservado al hito y a la acción principal.
- Superficies blancas sobre fondo perla frío (`#F4F7FB`), separadas por sombra ambiente sutil y hairlines de plata.
- Filas-acordeón antes que tablas; pills de estado como única fuente de color semántico.
- Números tabulares para contadores, documentos y fechas.
- Serif editorial solo para wordmark y titulares; sans nítida para todo lo demás.

## 2. Colors

Una paleta institucional fría y contenida: navy + plata cargan el 90% de cualquier
pantalla, el oro entra como acento de hito, y un semáforo funcional (verde/azul)
comunica el estado del trámite.

### Primary
- **Navy Institucional** (#142943): marca, estructura, chasis de barra superior, texto fuerte. El color por defecto de toda superficie oscura. Su variante profunda **Navy Deep** (#0E1F35, usada en gradiente `navy-deep`) viste la barra de navegación y los chips activos.

### Secondary
- **Oro Antiguo** (#B68D40): el sello. Acción principal (botón "Generar liquidación", gradiente `gold-sheen`), subrayado del enlace de nav activo, anillo del avatar, foco accesible, y el estado "Listo para liquidar". Su luz **Oro Claro** (#E9D196) solo aparece dentro del gradiente del sello.

### Neutral
- **Ink** (#16202E): color de cuerpo de texto sobre superficies claras. Contraste alto, no gris claro.
- **Plata Texto** (#8B93A6, silver-500): texto secundario, metadatos, placeholders. Nunca para texto largo de cuerpo.
- **Plata Hairline** (#CCD2DE, silver-300): bordes, divisores, anillos de inputs en reposo. La línea, no la sombra, separa.
- **Plata Track** (#EEF0F5, silver-100): fondos de pista (segmented, avatares, íconos de empty state).
- **Surface** (#FFFFFF): tarjetas, filas, inputs, modal.
- **Fondo Perla** (#F4F7FB): fondo base del sistema, plano y frío.

### Tertiary (semáforo de estado)
- **Verde Paz** (#16936A sobre #E4F5EE): aprobado / paz y salvo. El estado de cierre logrado.
- **Azul Liquidación** (#3B6FD4 sobre #E8EFFC): liquidación generada (en curso, a la espera de Control Interno).
- **Plata Pendiente** (#8B93A6): pendiente, sin urgencia cromática.
- **Rojo Rechazo** (#A4231F): no aprobado. El único rojo del sistema; se usa con cuidado.

### Named Rules
**La Regla del Sello.** El oro cubre ≤ 10% de cualquier pantalla. Es la acción
principal y el hito — nunca relleno, nunca fondo de sección, nunca decoración. Su
rareza es el punto: si todo es dorado, nada es el sello.

**La Regla del Semáforo Único.** El color semántico de un estado se define una sola vez
en `lib/ui.ts` y se pinta solo vía `EstadoPill`. Ningún componente reconstruye el color
de un estado a mano.

## 3. Typography

**Display Font:** Hoefler Text (con Iowan Old Style, Palatino, Georgia, serif)
**Body Font:** Sans del sistema (ui-sans-serif / system-ui / Segoe UI / Roboto)
**Data:** la misma sans con `font-variant-numeric: tabular-nums`

**Character:** un emparejamiento de contraste real: serif editorial de aire "delux"
para los pocos momentos de marca (wordmark, titular de pantalla, título de empty
state), y una sans neutra y nítida que carga toda la interfaz —labels, botones, datos,
cuerpo. No se mezclan dos sans ni dos serifs; el contraste es serif↔sans.

### Hierarchy
- **Display** (serif, 600, 1.5–1.75rem, lh 1.1): wordmark "Paz y Salvo", título de pantalla, título de empty state. Raro y deliberado.
- **Title** (sans, 600, 1rem, lh 1.3): encabezados de sección, nombre del funcionario en la fila.
- **Body** (sans, 400, 0.875rem, lh 1.5): texto de interfaz, descripciones. Prosa ≤ 65–75ch.
- **Label** (sans, 500, 0.75rem): pills, chips, contadores, metadatos, botones compactos.
- **Data** (sans, 500, 0.875rem, tabular-nums): documentos, fechas, contadores, barras de progreso. Las cifras se alinean en columna.

### Named Rules
**La Regla de la Serif Reservada.** La serif (`.font-display`) es para marca y
titulares, jamás para labels de UI, botones ni datos. Una serif en un botón es un error.

**La Regla Tabular.** Todo número que el ojo pueda comparar en columna (documentos,
contadores, fechas) usa cifras tabulares. Los números que bailan al cambiar de fila son
del software viejo.

## 4. Elevation

Sistema **plano con elevación ambiente sutil**: las superficies son blancas y planas;
la profundidad viene de una sombra difusa de baja opacidad (`shadow-luxe`) más un
hairline de plata, no de bordes gruesos ni sombras duras. La sombra dice "esto flota un
poco sobre el fondo perla", no "esto es un botón de 2014".

### Shadow Vocabulary
- **Luxe** (`box-shadow: 0 1px 2px rgba(16,28,51,0.04), 0 12px 28px -14px rgba(16,28,51,0.22)`): tarjetas, filas, botones secundarios en reposo. La elevación por defecto.
- **Luxe-lg** (`box-shadow: 0 2px 6px rgba(16,28,51,0.05), 0 24px 48px -20px rgba(16,28,51,0.30)`): hover de fila, modal de detalle. El levante al interactuar.
- **Gold** (`box-shadow: 0 8px 24px -10px rgba(182,141,64,0.55)`): solo el botón primario (sello) en hover. La única sombra de color del sistema.

### Named Rules
**La Regla del Hairline Primero.** La separación por defecto es una línea de plata
(`#CCD2DE`), no una sombra. La sombra se reserva para comunicar elevación real
(tarjeta sobre fondo, modal sobre página), no para enmarcar cada caja.

## 5. Components

### Buttons
- **Shape:** esquinas suaves — `rounded-lg` (8px) y `rounded-xl` (12px) para botones; `rounded-full` para botones-pill compactos.
- **Primary (el sello):** fondo gradiente `gold-sheen` (oro), texto navy profundo, `shadow-luxe`, anillo `gold-600/30`. Lleva un punto navy a la izquierda que crece sutilmente en hover. En hover gana `shadow-gold`. Es el único botón dorado de la pantalla.
- **Secondary:** superficie blanca, texto navy, borde de plata, `shadow-luxe`; en hover el borde vira a oro. Usado para "Continuar con Google" y acciones no principales.
- **Hover / Focus:** transición 200ms; foco visible con anillo oro (`outline: 2px solid rgba(182,141,64,0.65)`).
- **Disabled:** opacidad 50–60%, sin cambio de color.

### Chips (filtro)
- **Style:** pill `rounded-full`. Inactivo: superficie blanca, texto navy, anillo de plata; hover lleva el anillo a oro-300. Activo: gradiente `navy-deep`, texto blanco, anillo `gold/40`, `shadow-luxe`.
- **Contador:** cifra tabular a la derecha — oro-200 cuando activo, plata-400 cuando inactivo.

### Segmented (toggle de vista)
- **Style:** pista `silver-100` con anillo de plata, `rounded-full`, padding 4px. La pestaña activa es una pastilla blanca con `shadow-sm` y anillo de plata; las inactivas son texto plata que vira a navy en hover. Server-driven (cada opción es un `Link`).

### Inputs / Fields
- **Style:** `rounded-full`, superficie blanca, borde de plata, `shadow-sm`, ícono de lupa en plata a la izquierda.
- **Focus:** el borde y el anillo viran a oro-400 (`focus:ring-1 focus:ring-gold-400`); sin glow.
- **Placeholder:** plata-400 (cuidar contraste ≥ 4.5:1 en texto real, no en placeholder decorativo).

### Cards / Containers (Fila desplegable)
- **Corner Style:** `rounded-2xl` (16px).
- **Background:** superficie blanca; al expandir, el cuerpo revelado usa `silver-50/40`.
- **Shadow Strategy:** `shadow-luxe` en reposo → `shadow-luxe-lg` en hover (ver Elevation).
- **Border:** hairline `silver-200`; divisor interno `silver-100` al expandir.
- **Disclosure:** la cabecera ES el disparador (sin anidar interactivos); chevron que rota 90° al abrir; las acciones de rol viven fuera del disparador, a la derecha.

### Navigation
- **Style:** barra navy (gradiente `navy-deep`), enlaces en blanco al 65% que llegan a blanco pleno; el activo lleva un subrayado fino de `gold-sheen`. Condicionada por rol: cada rol ve solo sus destinos. `rounded-md` en el hit area.

### Avatar (firma)
- Disco `navy-50` con iniciales navy-700 y anillo de oro (`gold-200/50`), `rounded-full`. Tres tamaños (sm/md/lg). La marca premium en miniatura.

### Estado Pill (firma)
- Pastilla `rounded-full` con punto de color + etiqueta de texto (nunca solo color). Fondo tintado del propio matiz del estado (okBg/infoBg/listoBg) con anillo del mismo matiz al 30%. Fuente única: `lib/ui.ts`.

## 6. Do's and Don'ts

### Do:
- **Do** reservar el oro al hito y a la acción principal (Regla del Sello, ≤10% de la pantalla). El paz y salvo se siente porque el oro es raro.
- **Do** pintar todo estado vía `EstadoPill` desde `lib/ui.ts` — punto de color **+** etiqueta de texto, nunca solo color.
- **Do** usar cifras tabulares en documentos, contadores y fechas.
- **Do** separar con hairline de plata (`#CCD2DE`) por defecto; usar sombra solo para elevación real.
- **Do** mantener el cuerpo de texto en Ink (`#16202E`) con contraste ≥ 4.5:1; placeholders y secundarios en plata-500, nunca para prosa larga.
- **Do** reservar la serif (`.font-display`) a wordmark y titulares.
- **Do** dar a cada control sus estados: default, hover, focus visible (anillo oro), active, disabled; y una alternativa `prefers-reduced-motion`.

### Don't:
- **Don't** parecer **SaaS genérico**: nada de grids de cards idénticas, morados/gradientes de startup, ni eyebrows en mayúsculas tracked sobre cada sección, ni marcadores numerados de relleno (01/02/03).
- **Don't** parecer **software estatal anticuado**: nada de tablas grises densas sin jerarquía, formularios planos sin aire, ni contraste pobre.
- **Don't** recargar de oro: nada de veladuras doradas de fondo, foil metálico en texto de UI, ni gradientes dorados fuera del botón-sello.
- **Don't** usar `background-clip: text` con gradiente (texto en gradiente) para énfasis; el énfasis es por peso o tamaño, color sólido.
- **Don't** usar bordes laterales de color (`border-left` > 1px) como acento en filas o callouts.
- **Don't** poner serif en labels, botones o datos.
- **Don't** reconstruir el color de un estado a mano en un componente; siempre desde `lib/ui.ts`.
- **Don't** abrir un modal como primer recurso; preferir la fila-acordeón y la revelación progresiva (el modal de detalle es profundidad, no el camino por defecto).
