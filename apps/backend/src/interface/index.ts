import "dotenv/config"
import { crearApp } from "./app.js"
import { env } from "../config/env.js"

crearApp().listen(env.PORT, () => {
  console.log(`[pys] API → http://localhost:${env.PORT}`)
})
