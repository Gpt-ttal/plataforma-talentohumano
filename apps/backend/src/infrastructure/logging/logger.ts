import pino from "pino"

/**
 * Instancia única del logger estructurado (JSON). Sin `pino-pretty` a
 * propósito: no suma una segunda dependencia, y JSON crudo es igual de válido
 * en los logs de Vercel (los agrega y filtra igual). Nivel `debug` fuera de
 * producción para ver más detalle en desarrollo; `info` en producción.
 */
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
})
