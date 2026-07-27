# Plataforma de Talento Humano — Documento de Contexto

> **Para:** Coordinación de Automatización
> **De:** Leonardo Reales — Talento Humano, Corporación Universitaria Americana
> **Propósito de este documento:** dar contexto del proyecto para definir el acompañamiento
> de ingeniería adecuado en su siguiente etapa: la puesta en producción sobre la infraestructura
> institucional y la evolución técnica de la plataforma.

---

## 1. Qué es

La **Plataforma de Talento Humano** es un sistema web interno de la Corporación Universitaria
Americana que **gestiona de forma integral todo el ciclo de vida laboral** de las personas en la
institución: desde que se abre una **vacante** y se realiza la **contratación**, pasando por la
administración de su **hoja de vida**, su **formación y desarrollo**, hasta su **desvinculación**.

No es una herramienta de un solo trámite: es la **plataforma central del área**, donde todo lo que
ocurre con una persona —desde que ingresa hasta que se retira— queda registrado, ordenado y
conectado en un mismo lugar.

---

## 2. Propósito y visión

**Propósito.** Reemplazar procesos manuales, dispersos y en papel por un **circuito único, ordenado,
auditable y trazable** para toda la gestión de personas. Que cada quien entre con su cuenta
institucional y llegue directo a lo que le corresponde hacer.

**Visión.** Ser el **sistema nervioso de Talento Humano** de la universidad: una herramienta de uso
diario, confiable y viva, con la información en un solo lugar, siempre actualizada y disponible para
quien la necesita según su rol.

---

## 3. El ciclo que gestiona

La plataforma acompaña a la persona de principio a fin. Ese es el **cuerpo completo** del sistema:

```
   VACANTE  →  CONTRATACIÓN / VINCULACIÓN  →  GESTIÓN Y DESARROLLO  →  DESVINCULACIÓN
  (se abre     (ingresa y queda vinculada    (hoja de vida, forma-    (retiro y paz y
   la nece-     como empleado)                ción, capacitación)      salvo por áreas)
   sidad)
```

Cada etapa es un módulo de la plataforma. La **desvinculación** (el paz y salvo, que involucra a
varias áreas) es **la etapa de cierre** de ese ciclo — una parte importante, pero una parte; no el
todo.

---

## 4. El problema que resuelve

| Antes | Con la plataforma |
|---|---|
| Cada etapa (contratar, expediente, formación, retiro) en su propio archivo o correo | Todo el ciclo en una sola plataforma conectada |
| Información de la persona dispersa en Excel y carpetas | Un expediente único y completo por empleado |
| Sin trazabilidad de quién hizo qué y cuándo | Auditoría total de cada acción |
| Estados que nadie sabe en qué van | Estado visible en vivo para todos los involucrados |
| Retrasos por depender de correos y firmas físicas | Decisiones más rápidas, sin fricción y sin papel |

---

## 5. A quién sirve

Cada rol entra y ve **solo lo que le corresponde**:

- **Talento Humano** — administra el ciclo completo y da el cierre oficial.
- **Control Interno** — genera la liquidación y valida el paz y salvo final.
- **Áreas / Dependencias** — dan (o no) su visto bueno cuando les corresponde.
- **Seguridad y Salud en el Trabajo (SST)** — su ámbito de formación.
- **Administrador** — gobierno del sistema (accesos, permisos, catálogos).

---

## 6. Módulos y funcionalidades

La plataforma opera hoy **seis módulos**, que siguen el ciclo de vida de la persona:

1. **Vacantes** *(inicio del ciclo)* — Se define la necesidad de personal, se aprueba y se gestiona
   el proceso de contratación. Al contratar, la persona queda **vinculada automáticamente** como
   empleado.

2. **Administración de Personal — Hoja de Vida 360°** *(el corazón)* — El expediente integral de
   cada persona vinculada: datos personales, formación académica, experiencia, familia, información
   contractual y salarial. Toda la información de alguien, en un solo lugar.

3. **Capacitaciones** *(desarrollo)* — Registro de capacitaciones, control de asistencia (incluso
   por código QR) y certificación de horas.

4. **Cursos y Planificador** *(desarrollo)* — Cursos internos con módulos y lecciones, inscripción y
   seguimiento del progreso de cada participante; y la planeación anual de la formación.

5. **Desvinculaciones y Paz y Salvo** *(cierre del ciclo)* — Cuando una persona se retira, cada área
   competente da su visto bueno en línea; cuando todo está listo se genera la liquidación y se
   registra el paz y salvo final. Todo el circuito queda auditado paso a paso.

> Además, una **suite de Configuración y Gobierno**: control de quién puede acceder (por correo
> institucional) y de qué puede ver y hacer cada rol.

---

## 7. Estado actual

**La plataforma está en producción y en uso real.** En números simples, para dimensionar:

| Indicador | Valor |
|---|---|
| Módulos en funcionamiento | **6** (+ configuración/gobierno) |
| Pantallas de la aplicación | **~28** |
| Tamaño del desarrollo | **~40.000 líneas** de código propio |
| Pruebas automáticas que validan las reglas | **+570** |
| Sincronía en vivo | Lo que alguien aprueba, los demás lo ven **al instante** |
| Control de acceso | Por **rol** y por **correo institucional** |

Es un producto **maduro**, no un prototipo: reglas de negocio verificadas, control de acceso por rol
y trazabilidad completa.

---

## 8. En qué está construido y el salto que debe dar

La plataforma tiene **tres capas**, y cada una está en un punto distinto de su evolución:

| Capa | En palabras simples | Tecnología hoy | Qué pasa en esta etapa |
|---|---|---|---|
| **La cara** | Lo que el usuario ve y usa | React + TypeScript | **Se conserva.** Es moderna y sólida; **no cambia de tecnología.** |
| **El motor** | Procesa la lógica y las reglas | Node.js | **Aquí está el mayor salto:** evoluciona —o se reconstruye— para robustecerlo y alinearlo al stack institucional. |
| **Los datos** | Donde se guarda todo | PostgreSQL | Se mantiene el tipo de base de datos; **se muda** a la infraestructura de la universidad. |
| **La infraestructura** | Dónde vive el sistema | Proveedor externo | **Salto** a los servidores institucionales (**DigitalOcean**, administrados por TIC). |

**En resumen del salto:** la cara de la aplicación se mantiene tal cual; el motor se fortalece o se
rehace; y todo se lleva a la infraestructura que administra la universidad, cumpliendo sus estándares
de seguridad y tratamiento de datos.

---

## 9. Impacto para la institución

- **Cero papel** y menos correos en los trámites del área.
- **Trazabilidad total**: se sabe quién hizo qué y cuándo.
- **Información centralizada y confiable**: una sola fuente de verdad por persona.
- **Decisiones más rápidas** y menos errores por reprocesos manuales.
- **Seguridad**: cada quien accede solo a lo que su rol permite.

---

## 10. Hacia dónde sigue — alcance del acompañamiento

El proyecto entra en una **nueva etapa** que requiere acompañamiento de ingeniería:

1. **Puesta en producción sobre la infraestructura institucional.** Llevar la plataforma a los
   servidores que administra la universidad, con su propia base de datos, cumpliendo los estándares
   de seguridad y tratamiento de datos de la institución.

2. **Evolución y fortalecimiento del motor de la aplicación.** Se prevén **cambios importantes** en
   la capa que procesa la lógica —incluso reconstruirla— para dejarla más robusta, mantenible y
   alineada al stack institucional. *(La cara de la aplicación no cambia de tecnología.)*

3. **Buenas prácticas y sostenibilidad.** Acompañar el proyecto para que su crecimiento sea ordenado,
   documentado y sostenible en el tiempo.

**Qué tipo de acompañamiento se busca:** un(a) ingeniero(a) con experiencia en **aplicaciones web
modernas** y en **despliegue sobre servidores en la nube**, que pueda guiar la puesta en producción
sobre la infraestructura institucional y acompañar la evolución técnica del proyecto.

---

## 11. Costos de infraestructura (servidor y base de datos)

Para llevar la plataforma a la infraestructura institucional (**DigitalOcean**) se necesitan
**dos recursos**: un **servidor** donde corre la aplicación y una **base de datos** donde se guardan
los datos de forma segura y respaldada.

Un dato relevante: **la información de la plataforma es liviana** (para ~500 funcionarios con toda su
hoja de vida son apenas unos pocos megabytes de datos). Esto significa que **no hace falta contratar
planes grandes** — los planes de entrada sobran durante años.

**Estimado para arrancar (MVP en producción):**

| Recurso | Para qué | Plan sugerido | Costo aprox. |
|---|---|---|---|
| **Servidor** | Ejecuta la aplicación | 2 vCPU · 4 GB RAM · 80 GB | **~$24 USD/mes** (~COP 89.000) |
| **Base de datos** | Guarda y respalda los datos | PostgreSQL · 1 GB · 10 GB | **~$15 USD/mes** (~COP 56.000) |
| **Total** | | | **~$39 USD/mes** (~COP 145.000) |

> **Notas:**
> - Es un estimado de referencia con precios de lista. **TIC tiene los precios exactos de su cuenta**
>   y define la elección final del plan.
> - Se recomienda una **base de datos gestionada** (con respaldos automáticos incluidos), no instalada
>   a mano en el servidor — justo por seguridad y tratamiento de datos.
> - Si más adelante el uso lo pide, se puede **ampliar la base de datos** o **agregar un servidor de
>   respaldo** para tolerancia a fallos; ambos con un ajuste sencillo, sin rehacer nada.

---