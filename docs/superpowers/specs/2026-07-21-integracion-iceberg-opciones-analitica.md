# Integración Iceberg → Plataforma de Personal — Opciones de transporte

> **Para:** equipo de Analítica de Datos (que opera los flujos n8n + SQL contra Iceberg).
> **De:** Talento Humano / desarrollo Plataforma de Administración de Personal (Leonardo Reales).
> **Propósito:** proponer **opciones** (no una decisión cerrada) sobre *cómo* el dato de Iceberg llega
> a la Plataforma. Desconocemos los detalles de su flujo actual (si consultan por API, por conexión
> SQL directa, con qué orquestación); por eso esto es una lista de ideas para que **ustedes elijan**
> la que mejor encaje con lo que ya tienen.
>
> El diseño interno (qué hacemos de nuestro lado con el dato una vez llega) está en
> [`2026-07-21-sync-iceberg-hoja-vida-360-design.md`](2026-07-21-sync-iceberg-hoja-vida-360-design.md).

---

## Lo que necesitamos, en una línea

Recibir periódicamente un conjunto de registros de personal (los 28 atributos autorizados), por
cédula, que del lado de la Plataforma **entran como lote pendiente de revisión** — nunca escriben
directo. La forma de entregarlos es lo que queremos acordar.

---

## Los 28 atributos (contrato de datos)

Cédula · nombre completo · sexo · tipo de documento · fecha de expedición · nacionalidad · fecha de
nacimiento · lugar de residencia · dirección · teléfono · barrio · estado civil · personas a
cargo/dependientes · correo · cargo · estado del contrato · centro de costos (CeCo) · fondo/sede ·
fecha de ingreso · fecha de finalización · dependencia · tipo de empleado · tipo de contrato ·
salario · categoría · EPS · fondo de pensiones y cesantías · certificado bancario.

> **Pendiente clave:** el **formato exacto del "certificado bancario"** (¿banco + número?, ¿tipo de
> cuenta?, ¿titular?, ¿archivo adjunto?) define cómo lo modelamos. Necesitamos una muestra real.

---

## Opción A — n8n hace *push* a un endpoint nuestro (webhook) **[recomendada]**

Su flujo n8n, tras consultar Iceberg, hace `POST` a un endpoint HTTPS que exponemos, con el lote en
JSON. Nosotros lo guardamos como lote pendiente.

- **A favor:** ustedes mantienen el control del "cuándo" (cron de n8n); desacoplado; no damos acceso
  a nuestra BD; auditable; encaja natural con n8n (nodo HTTP Request).
- **En contra:** definimos un contrato JSON y un mecanismo de autenticación de servicio (API key en
  header, o firma). Manejo de reintentos/idempotencia por su lado.
- **De nuestro lado:** endpoint + auth de servicio + validación. Idempotencia por cédula+corrida.

## Opción B — Ustedes escriben a una tabla/vista de *staging* que exponemos

Les damos credenciales a una tabla de staging dedicada (solo esa) en nuestra base; su flujo SQL
inserta ahí; nosotros la procesamos a lote pendiente.

- **A favor:** si su flujo ya es SQL puro, es el menor cambio para ustedes; sin contrato HTTP.
- **En contra:** acopla ambos lados a un esquema de tabla; hay que dar y gestionar un credencial de
  BD acotado (riesgo de superficie); versionar la tabla es más rígido.

## Opción C — Archivo intermedio (export a un bucket/carpeta compartida)

Su flujo deja un archivo (CSV/JSON) en un almacenamiento compartido (bucket, Drive, carpeta); un job
nuestro lo levanta y lo procesa a lote.

- **A favor:** máximo desacople; trivial de reintentar/reprocesar; fácil de auditar (queda el
  archivo); no exponemos endpoint ni BD.
- **En contra:** más piezas móviles (almacenamiento + job de lectura); latencia por lotes; hay que
  acordar convención de nombres/ubicación/limpieza.

---

## Comparación rápida

| Criterio | A · Webhook push | B · Tabla staging | C · Archivo |
|---|---|---|---|
| Encaje con n8n | Alto (HTTP node) | Medio (SQL node) | Medio |
| Cambio de su lado | Bajo–Medio | Bajo (si ya es SQL) | Bajo |
| Superficie de seguridad | Baja (API key) | Media (credencial BD) | Baja |
| Control del "cuándo" | Ustedes (cron n8n) | Ustedes | Ustedes |
| Reproceso/auditoría | Media | Baja | Alta |
| Acople de esquema | Bajo (JSON versionado) | Alto | Bajo |

**Recomendación:** Opción A (webhook push). Es la que mejor aprovecha n8n, mantiene su autonomía
sobre la frecuencia, y minimiza lo que compartimos. Pero si su flujo actual ya es SQL directo sobre
una base y prefieren no tocar HTTP, la B es válida. Ustedes deciden según lo que ya tengan montado.

---

## Preguntas para ustedes (para cerrar la elección)

1. Su flujo n8n hoy, ¿cómo saca el dato de Iceberg — API REST, conexión SQL directa, otra?
2. ¿Prefieren empujar (push) o que nosotros consultemos/leamos (pull)?
3. ¿Con qué frecuencia esperarían sincronizar — diaria, por evento (nuevo ingreso/novedad), on-demand?
4. ¿Pueden entregar un **registro de ejemplo real** (anonimizado) con los 28 campos, en especial el
   certificado bancario?
5. ¿Envían siempre el universo completo, o solo altas/cambios (delta)?
```
