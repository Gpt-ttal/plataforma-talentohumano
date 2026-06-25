# Flujo TH ↔ Control Interno, 4º estado y detalle como modal — Diseño

- **Fecha:** 2026-06-23
- **Autor:** Leonardo Reales (leonardoreales@americana.edu.co) + Claude
- **Estado:** Aprobado para implementación
- **Amplía a:** `2026-06-23-sistema-paz-y-salvo-mvp-design.md`

---

## 1. Objetivo

Refinar el cierre del paz y salvo introduciendo dos actores —**Talento Humano (TH)**
y **Control Interno (CI)**— con un relevo explícito y trazable, y convertir el
detalle del funcionario en un **modal premium** que se abre sobre la lista. Todo debe
quedar **sincronizado** (un solo origen de verdad), con los **estados pintados** de
forma consistente y el mismo vocabulario en toda la app.

## 2. Flujo refinado y 4º estado

El estado global gana un cuarto valor intermedio:

```
PENDIENTE → LISTO_PARA_LIQUIDAR → LIQUIDACION_GENERADA → PAZ_Y_SALVO
```

- **Áreas todas OK** (APROBADO/NO_APLICA) → `LISTO_PARA_LIQUIDAR`.
- **TH "Genera liquidación"** → `LIQUIDACION_GENERADA` y **avisa por correo** a CI.
- **CI "Registra liquidación / Da paz y salvo"** → `PAZ_Y_SALVO`.

### Máquina de estados (pura, `lib/estado.ts`, TDD)

Entrada: `estadosAreas`, `liquidacionGenerada` (flag TH), `liquidado` (flag CI).

```
hayRechazo = alguna área == NO_APROBADO
todasOk    = hay áreas y todas ∈ {APROBADO, NO_APLICA}

!todasOk                         → PENDIENTE
todasOk && liquidado             → PAZ_Y_SALVO
todasOk && liquidacionGenerada   → LIQUIDACION_GENERADA
todasOk                          → LISTO_PARA_LIQUIDAR
```

**Integridad / reinicio:** si tras generar/cerrar un área se devuelve a
PENDIENTE/NO_APROBADO, `todasOk` es falso → el funcionario vuelve a `PENDIENTE` y se
**limpian** los hitos `fechaLiquidacionGenerada` y `fechaLiquidacion` (en el recompute
de cada repo). El flujo se reinicia limpio; no hay saltos fantasma.

## 3. Modelo de datos (dos hitos, dos manos)

`Funcionario` agrega el hito de TH y conserva el de cierre:

| Campo                     | Tipo            | Lo setea | Significado                          |
| ------------------------- | --------------- | -------- | ------------------------------------ |
| `fechaLiquidacionGenerada`| timestamptz null| TH       | Cuándo TH generó la liquidación.     |
| `liquidacionGeneradaPor`  | text null       | TH       | Autor (rol) de la generación.        |
| `fechaLiquidacion` (ya existe) | timestamptz null | CI  | Cierre final → paz y salvo.          |
| `liquidadoPor`            | text null       | CI       | Autor (rol) del cierre.              |

Supabase: migración `0002` añade el valor de enum y las columnas; `estado_global` se
sigue calculando en la app y se persiste.

## 4. Servicios y acciones

- **`generarLiquidacion(funcionarioId, autor)`** *(nuevo)* — exige
  `LISTO_PARA_LIQUIDAR`; marca el hito de TH → `LIQUIDACION_GENERADA`; dispara el
  correo a CI (best-effort: si el correo falla, el estado igual queda).
- **`registrarLiquidacion(funcionarioId, autor)`** *(re-gatillado)* — ahora exige
  `LIQUIDACION_GENERADA` (antes `LISTO_PARA_LIQUIDAR`) → `PAZ_Y_SALVO`.

## 5. Notificación a Control Interno

`lib/notificaciones.ts`, notificador desacoplado:

- Destinatario por env `CONTROL_INTERNO_EMAIL`, default `leonardoreales@americana.edu.co`.
- Con `RESEND_API_KEY` presente → envía por Resend; sin ella → loguea el correo
  (la demo corre sin secretos). El envío real se activa con sólo poner la llave.

## 6. Roles simulados (sin login todavía)

Modos de vista vía `?rol=th` / `?rol=ci` (como el "admin" actual):

- **Talento Humano:** tabla consolidada completa + botón **"Generar liquidación"** en
  filas `LISTO_PARA_LIQUIDAR`.
- **Control Interno:** tabla completa + **bandeja destacada** de `LIQUIDACION_GENERADA`
  + botón **"Registrar liquidación / Dar paz y salvo"**.
- **Admin (Todo):** ambas acciones.

La validez la garantiza la máquina de estados en el servidor, no la UI. El
`SelectorVista` agrupa *Supervisión: Todo · Talento Humano · Control Interno* y *Áreas*.

## 7. Pintado consistente de estados

- `lib/ui.ts`: label "Liquidación generada", badge y punto en **tono navy** (distinto
  del oro de "Listo" y el verde de "Paz y salvo"). `Badges` lee de `ui.ts`, así que se
  pinta solo en lista, detalle, modal y dashboard.
- **Dashboard:** 4 tarjetas de estado (no 3) + grilla ajustada; el aging excluye
  `LIQUIDACION_GENERADA` y `PAZ_Y_SALVO` (resueltos por parte de las áreas).
- **Detalle:** muestra ambos hitos (generada / paz y salvo, con autor y fecha) y el
  botón correcto según el estado.

## 8. Detalle como modal premium (rutas interceptadas)

- `components/DetalleFuncionario.tsx` *(nuevo)* — cuerpo del detalle, único origen de
  verdad para ese UI (ver + gestionar).
- `/funcionarios/[id]` (página completa) lo reusa para navegación directa / recarga /
  compartir.
- Slot paralelo `@modal` + ruta interceptora `(.)[id]`: click en la lista abre el mismo
  detalle como **modal centrado** sobre la lista; recargar la URL muestra la página
  completa.
- `components/Modal.tsx` *(nuevo)*: centrado, backdrop con blur navy, hairline dorado,
  cierra con Esc / click-fuera (`router.back()`), animación fade+scale.
- Mutaciones dentro del modal hacen `router.refresh()`; el modal permanece abierto con
  el estado actualizado.

## 9. Archivos

Núcleo (TDD): `lib/domain.ts` · `lib/estado.ts` · `tests/estado.test.ts`.
Datos/servicios: `lib/repos/types.ts` · `lib/repos/memory.ts` · `lib/repos/supabase.ts`
· `lib/seed.ts` · `lib/services.ts` · `lib/notificaciones.ts` *(nuevo)* · `app/actions.ts`.
UI: `lib/ui.ts` · `components/SelectorVista.tsx` · `app/funcionarios/page.tsx` ·
`app/page.tsx` · `components/LiquidarButton.tsx` · `components/GenerarLiquidacionButton.tsx`
*(nuevo)*.
Modal: `components/DetalleFuncionario.tsx` *(nuevo)* · `components/Modal.tsx` *(nuevo)* ·
`app/funcionarios/layout.tsx` *(nuevo)* · `app/funcionarios/@modal/default.tsx` *(nuevo)*
· `app/funcionarios/@modal/(.)[id]/page.tsx` *(nuevo)* · `app/funcionarios/[id]/page.tsx`
*(refactor)*.
Infra: `supabase/migrations/0002_liquidacion_generada.sql` *(nuevo)* · `supabase/seed.sql`
· `.env.example`.

## 10. Fuera de alcance

Login/auth real y roles persistidos (fase 2); Acta PDF (fase 3); el envío de correo
queda listo pero arranca en modo log hasta configurar `RESEND_API_KEY`.
