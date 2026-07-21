# Propuesta de integración: sincronización de datos institucionales (Iceberg) con Sistema Paz y Salvo

**Fecha:** 2026-07-09
**De:** Leonardo Reales — Talento Humano / Desarrollo, Sistema Paz y Salvo
**Para:** Equipo de Analítica de Datos
**Estado:** Propuesta inicial, abierta a discusión — solicitud formal de exploración conjunta,
no una definición cerrada de nuestra parte

---

## 1. Contexto — ¿qué es Sistema Paz y Salvo?

Sistema Paz y Salvo es la herramienta interna de la Corporación Universitaria Americana que
digitaliza el trámite de paz y salvo cuando un funcionario se retira, y que además se ha
extendido a un **módulo de Administración de Personal**: el maestro de empleados activos de la
institución (hoja de vida, datos de contrato, formación, familia, etc.), usado a diario por
Talento Humano para gestión y consulta.

Ese maestro de empleados hoy se alimenta principalmente de dos fuentes: captura manual desde la
aplicación, y una carga inicial masiva hecha a partir de archivos Excel entregados por TH. No
existe hoy una sincronización automática con los sistemas institucionales de origen.

## 2. El problema que queremos resolver

Entendemos que el equipo de Analítica de Datos ya tiene un flujo construido en **n8n** que
consulta la plataforma **Iceberg** (fuente de datos institucionales) de forma **solo lectura** —
sin modificar ni escribir nada en Iceberg. Nos gustaría explorar con ustedes la posibilidad de
aprovechar ese flujo ya existente para que el maestro de empleados de Paz y Salvo deje de
depender de cargas manuales y pueda mantenerse **sincronizado de forma periódica** con la fuente
institucional real — si esto es viable y tiene sentido desde su lado.

**Objetivo de negocio que nos motiva:** que Talento Humano pueda contar en Paz y Salvo con una
copia razonablemente actualizada del personal institucional, sin depender de que alguien exporte
y suba un Excel a mano cada vez. Este documento es el punto de partida para conversar esa
posibilidad con ustedes, no una solicitud de acceso inmediato — entendemos que la decisión final
de cómo (o si) se habilita este acceso depende de su equipo y de los dueños del dato.

## 3. Alcance que tenemos en mente (para evitar malentendidos)

Para partir de una base clara:

- No estamos buscando acceso de escritura a Iceberg, ni modificar nada allá — pensamos esto como
  una relación de un solo sentido, Iceberg → nosotros, siempre en lectura.
- No pensamos en acceso directo a su base de datos ni a su infraestructura interna, sino en
  aprovechar el flujo/endpoint que ya tienen construido, si ustedes consideran que es apropiado
  usarlo para este fin.
- No buscamos reemplazar ningún proceso que ya tengan, sino entender si tiene sentido para ambos
  reusar lo que ya construyeron, en vez de que nosotros dupliquemos esa lógica de consulta.

## 4. Una posible arquitectura — como punto de partida para conversar

Dejamos aquí una idea inicial de cómo podría funcionar, **no como algo cerrado**, sino como base
para que ustedes nos digan qué es realmente viable desde su infraestructura y sus propias
prácticas de gobierno de datos:

```
n8n (disparador programado, ej. 1 vez por noche — a definir juntos)
  → consulta Iceberg (solo lectura, ya construido de su lado)
  → envía los datos a un endpoint que dispondríamos en nuestro backend
       (autenticado con un secreto propio, no con login de usuario)
  → nuestro sistema actualiza el maestro de empleados de forma segura
```

**La razón detrás de esta idea** (que con gusto ajustamos si ustedes ven un mejor camino): si
nuestra aplicación llamara a Iceberg cada vez que alguien abre el catálogo de personal, cualquier
lentitud o mantenimiento de su lado se sentiría de inmediato en nuestra operación diaria. Por eso
nos parece más sano que la sincronización ocurra en un horario que ustedes definan y controlen,
en vez de que nosotros consultemos en vivo — pero estamos abiertos a que ustedes nos propongan
otra forma si ya tienen un patrón distinto que prefieran usar con otros consumidores de este dato.

Este patrón (sincronizar sin sobrescribir ediciones manuales ya hechas) ya lo aplicamos hoy con
éxito en nuestra carga inicial desde Excel — lo mencionamos solo como antecedente de que sabemos
manejar este tipo de sincronización con cuidado, no como algo que estemos exigiendo replicar tal
cual.

## 5. Preguntas que nos gustaría explorar en conjunto

No las planteamos como una lista de requisitos, sino como los puntos que necesitaríamos entender
juntos antes de que cualquiera de los dos equipos se comprometa con algo:

### 5.1 Sobre el acceso técnico

- ¿Existe hoy un endpoint/webhook que se pueda usar para esto, o habría que construirlo?
  ¿Hay un ambiente de pruebas separado de producción?
- ¿Qué mecanismo de autenticación manejan o preferirían usar (API key, token, firma, IP)?
- ¿Podrían compartirnos un ejemplo real del formato de datos que devuelve la consulta?
- ¿La consulta responde de inmediato, o es un proceso que entrega el resultado después?

### 5.2 Sobre el contrato de datos

- ¿Qué campos trae exactamente un registro de empleado, y cuál sería el identificador único
  para cruzarlo con nuestra cédula/documento?
- ¿La consulta incluye información salarial? Lo preguntamos porque en Paz y Salvo el salario
  vive en una tabla aparte con acceso restringido — si Iceberg también la expone, necesitaríamos
  entender cómo replicar esa misma protección de nuestro lado.
- ¿Es posible traer solo lo que cambió desde una fecha (incremental), o siempre es el universo
  completo?
- ¿Incluye personal inactivo/retirado, o solo activos?

### 5.3 Sobre gobierno y seguridad

- ¿Qué aprobación interna sería necesaria de su parte (o de los dueños del dato) para habilitar
  este acceso? Queremos seguir el proceso correcto, no atajarlo.
- ¿Qué frecuencia de consulta es razonable para su infraestructura, sin afectarles su servicio?
- ¿A quién contactamos si algo falla o si el contrato de datos cambia?

### 5.4 Sobre estabilidad

- ¿Nos podrían avisar con anticipación si el formato de los datos va a cambiar?
- ¿Tienen algún límite de uso ya definido que debamos respetar?

## 6. Compromisos que podemos ofrecer de nuestro lado

Si tras esta conversación deciden que la integración tiene sentido, esto es lo que nos
comprometeríamos a garantizar en Paz y Salvo:

- Un mecanismo de autenticación propio para este acceso, independiente del login de usuarios, y
  que solo acepte peticiones desde el flujo que ustedes autoricen.
- Registro de auditoría de cada sincronización (qué llegó, cuántos registros, si hubo errores) —
  mismo estándar que ya aplicamos a otras operaciones sensibles del sistema.
- Ninguna sincronización sobrescribirá en silencio una edición manual ya hecha desde la
  aplicación por Talento Humano.
- Si el contrato de datos incluye información salarial, aplicaríamos el mismo nivel de
  restricción de acceso (solo Superadmin/TH) que ya tiene esa información dentro de Paz y Salvo.

## 7. Propuesta de próximos pasos

1. Una reunión breve de socialización con el equipo de Analítica de Datos, para presentar esta
   idea y escuchar su punto de vista sobre viabilidad, gobierno de datos y forma técnica.
2. A partir de esa conversación, decidir juntos si esto avanza, se ajusta, o no procede.
3. Si avanza: resolver en conjunto las preguntas de la sección 5 antes de diseñar nada en firme.
4. Diseño técnico detallado (fuera de alcance de este documento) solo una vez haya claridad y
   acuerdo de ambos equipos.
5. Prueba en ambiente controlado antes de cualquier sincronización recurrente en producción.

---

*Este es un documento de exploración y solicitud formal de conversación, no una definición
cerrada ni una exigencia de acceso. Cualquier paso posterior queda sujeto a lo que se acuerde con
el equipo de Analítica de Datos y con los dueños del dato.*
