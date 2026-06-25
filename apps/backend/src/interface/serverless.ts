import serverless from "serverless-http"
import { crearApp } from "./app.js"

/** Handler para despliegue serverless (envuelve la app Express). */
export const handler = serverless(crearApp())
