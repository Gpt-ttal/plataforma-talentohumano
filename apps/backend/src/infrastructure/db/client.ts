import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import { env } from "../../config/env.js"
import * as schema from "./schema.js"

// En serverless (Vercel) cada instancia caliente mantiene su propio pool, así que
// lo acotamos a 1 conexión por instancia y dejamos que el transaction pooler de
// Supabase (Supavisor, puerto 6543 en DATABASE_URL) multiplexe hacia Postgres.
// `pg`/Drizzle no usan prepared statements por defecto → el transaction pooler es
// seguro. Si se activa Vercel Fluid Compute (varias requests por instancia), subir
// `max` a 2–3.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
})
export const db = drizzle(pool, { schema })
