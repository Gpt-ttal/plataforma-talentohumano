# Architecture Decision Records (ADR)

Decisiones de arquitectura ya tomadas en el proyecto, registradas como ADR (el **por qué**, no el
**qué** — el qué vive en [`../ARCHITECTURE.md`](../ARCHITECTURE.md)). Formato:
Status / Context / Decision / Consequences / Alternatives Considered / References.

Al tomar una decisión de arquitectura nueva, agregar un ADR numerado aquí (no editar los existentes
salvo para marcar `Deprecated` / `Superseded by ADR-XXXX`).

| # | Decisión | Origen |
|---|----------|--------|
| [0001](0001-monorepo-vite-express.md) | Monorepo Vite + Express con dominio compartido (reemplazo de Next.js) | Sesiones 4–11 |
| [0002](0002-autorizacion-centralizada-backend.md) | Autorización centralizada en el backend (el frontend solo refleja UX) | Sesiones 5–6, 12 |
| [0003](0003-una-tabla-dos-proyecciones.md) | "Una tabla, dos proyecciones" (Funcionario / Empleado por `fecha_retiro`) | Sesión 28 |
| [0004](0004-tablas-satelite-360-rls-salarial.md) | Tablas satélite para la Hoja de Vida 360° + RLS del bloque salarial | Sesión 32 |
| [0005](0005-maquina-de-estados-pura.md) | Máquina de estados pura e intocable sin TDD | Diseño original |
| [0006](0006-rls-deny-directo-por-defecto.md) | RLS "deny-directo" por defecto en tablas nuevas | Sesión 23 |
| [0007](0007-plataforma-modulos-declarativos.md) | Plataforma con registro declarativo de módulos | Sesiones 24–25 |
| [0008](0008-concurrencia-optimista-lock-condicional.md) | Concurrencia con lock pesimista + UPDATE condicional (no locks distribuidos) | Sesiones 24, 43 |
| [0009](0009-puente-vacante-funcionario.md) | Puente Vacante→Funcionario: crear el empleado al contratar la vacante | Sesión 53 |
