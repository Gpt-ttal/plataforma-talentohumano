# Product

## Register

product

## Users

Personal interno de la **Corporación Universitaria Americana**, operando una
plataforma diaria de gestión de Talento Humano. Cinco roles, cada uno con un
trabajo acotado:

- **Usuario de área** (p. ej. Contabilidad, Biblioteca): da su visto bueno a los
  funcionarios que se retiran. Solo le importa su bandeja.
- **Talento Humano (TH):** ve el catálogo completo, gestiona el expediente 360° del
  personal, genera la liquidación cuando un funcionario está listo, y administra
  Capacitaciones/Cursos/Planificador.
- **Control Interno (CI):** revisa lo generado y registra el paz y salvo final.
- **SST:** gestiona capacitaciones y cursos de su propio ámbito.
- **Superadministrador:** lo ve todo, inspecciona cualquier área/módulo y administra
  usuarios y catálogo de áreas.

Contexto de uso: oficina, escritorio, luz de día (con modo oscuro disponible),
sesiones cortas y repetidas para resolver trámites. No es una herramienta de
exploración lúdica; es un flujo que la gente quiere completar rápido y sin errores.
Idioma: español (es-CO).

## Product Purpose

**Sistema Paz y Salvo** es la plataforma de Talento Humano de la universidad.
Su núcleo original digitaliza el trámite de paz y salvo cuando un funcionario se
retira: cada área competente da (o no) su visto bueno → TH genera la liquidación
cuando todo está listo → CI registra el paz y salvo final. Alrededor de ese núcleo
conviven módulos hermanos registrados declarativamente (`shared/src/modulos.ts`):
**Administración de Personal** (hoja de vida 360° del empleado activo),
**Capacitaciones/Eventos** (registro de asistencia por QR) y **Cursos + Planificador**
(cursos autoformativos con progreso en vivo + plan anual de capacitaciones).
Reemplaza procesos manuales dispersos por circuitos únicos, auditables y por rol.

El éxito se ve como: cada persona entra con su cuenta institucional y cae **directo y
solo** a lo que le corresponde; la validez de cada acción la garantiza el servidor
(máquina de estados + guardas), no la UI; y el estado de cualquier funcionario o
trámite es legible de un vistazo.

> **Estado:** producto maduro en producción. El núcleo de Paz y Salvo, Administración
> de Personal (incl. hoja de vida 360°), Capacitaciones/Eventos, Cursos y Planificador
> están completos y operando sobre datos reales (500+ empleados). El sistema visual
> "El Sello" está implementado con theming claro/oscuro. La superficie más reciente
> en construcción es la sección "Formación" (Eventos/Cursos/Planificador), que necesita
> una pasada de diseño — hoy las 3 páginas son visualmente genéricas y planas.

## Brand Personality

**Institucional · nítida · confiable.** Autoridad universitaria seria pero moderna;
una herramienta diaria sin fricción, no una vitrina. La identidad premium (navy
profundo + oro antiguo) es un activo y se conserva — pero se aplica con **contención**:
el oro marca hitos y la acción principal, no decora cada superficie. La voz es directa,
sobria y en español claro; los momentos de cierre (aprobado, paz y salvo) se sienten
sin que el resto grite.

## Anti-references

- **SaaS genérico.** Grids de cards idénticas, morados/gradientes de startup, eyebrows
  en mayúsculas sobre cada sección, marcadores numerados de relleno (01/02/03). Sin
  identidad institucional. Prohibido.
- **Software estatal anticuado.** Tablas grises densas sin jerarquía, formularios
  planos sin aire, contraste pobre, cero ritmo. Es justo el "sistema viejo" que esto
  reemplaza.
- (Matiz del spec: bajarle al "lujo recargado" — veladuras y foil metálico de más —
  sin perder la identidad premium. La marca se nota, no se recarga.)

## Design Principles

1. **El servidor es la verdad; la UI solo la refleja.** La interfaz muestra u oculta
   lo que el servidor ya garantizó (permisos, estado). Nunca es la fuente de verdad.
2. **Cada rol cae directo a lo suyo.** Mínima navegación, máxima relevancia: nadie ve
   lo que no le toca, y nadie tiene que buscar su trabajo.
3. **Herramienta diaria, no vitrina.** Claridad y velocidad de lectura por encima del
   espectáculo. La identidad premium se nota; no estorba el trámite.
4. **Una sola fuente de pintado por estado.** El color y la etiqueta de cada estado se
   definen una vez (`lib/ui.ts`) y se reusan en lista, detalle, modal, dashboard y
   bandejas. Consistencia por construcción, no por disciplina.
5. **El cierre es un hito.** Aprobado y paz y salvo merecen un acento que se sienta
   (oro/verde), sin recargar los estados intermedios ni el resto de la pantalla.

## Accessibility & Inclusion

Objetivo: **WCAG 2.1 AA.**

- Contraste de texto ≥ 4.5:1 (≥ 3:1 para texto grande); placeholders incluidos.
- Foco siempre visible (anillo oro accesible ya definido en `globals.css`).
- Operable por teclado de extremo a extremo (acordeones, modal, segmented, paginación).
- Respeta `prefers-reduced-motion`: toda animación tiene alternativa de fundido/instantánea.
- No depender solo del color para comunicar estado: pill = punto + etiqueta de texto.
- Localización es-CO para fechas, números y copy.
- Theming claro/oscuro (`ThemeProvider`, clase `.dark`, tokens CSS semánticos) mantiene el
  mismo contraste AA en ambos modos.
