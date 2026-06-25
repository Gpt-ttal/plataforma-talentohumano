/**
 * Entrypoint serverless para Vercel. Re-exporta el handler de Express ya envuelto
 * con `serverless-http` (composition root en `apps/backend/src/interface`). Vercel
 * monta este archivo como una Serverless Function bajo `/api/*` (ver vercel.json).
 *
 * El frontend (`apps/web`) se sirve como estático desde `apps/web/dist`; sus
 * llamadas a `/api` caen aquí. La autorización real vive en el backend.
 */
export { handler as default } from "../apps/backend/src/interface/serverless.js"
