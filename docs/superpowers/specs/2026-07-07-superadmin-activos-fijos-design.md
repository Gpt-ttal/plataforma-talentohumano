# Superadmin Activos Fijos Design

## Contexto

`Activos fijos` existe en el sistema como area del flujo de Paz y Salvo, no como rol. El rol `SUPERADMIN` no debe recibir `areaId`, porque el dominio y la base de datos mantienen la invariante de que solo usuarios `AREA` pueden tener area asignada.

## Diseno Aprobado

El usuario `SUPERADMIN` conservara su rol actual y tendra un acceso directo desde la navegacion a la bandeja operativa de Activos fijos. Ese acceso usara la ruta existente de bandejas por area con el parametro del area semilla: `/paz-y-salvo/mi-area?area=1`.

No se crea un rol nuevo ni se cambia la asignacion del usuario. La autorizacion de backend se mantiene como esta: `SUPERADMIN` puede ver y gestionar cualquier area mediante `areaPermitida`.

## Alcance

- Cambiar la navegacion de `SUPERADMIN` para mostrar `Activos fijos`.
- Apuntar ese item a `/paz-y-salvo/mi-area?area=1`.
- Mantener disponible la pagina existente de `MiAreaPage`, con selector de areas para superadmin.
- Agregar una prueba de frontend que cubra el enlace visible y su destino.

## Fuera de Alcance

- No crear roles compuestos.
- No asignar `areaId` al superadmin.
- No tocar migraciones ni datos productivos.
- No cambiar guardas de backend.
