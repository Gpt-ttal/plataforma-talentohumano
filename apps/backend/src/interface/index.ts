import "dotenv/config"
import { crearApp } from "./app.js"
import { env } from "../config/env.js"
import { logger } from "../infrastructure/logging/logger.js"

crearApp().listen(env.PORT, () => {
  logger.info(`[pys] API → http://localhost:${env.PORT}`)
})
