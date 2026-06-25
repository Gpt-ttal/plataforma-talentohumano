import { createClient } from "@supabase/supabase-js"

/**
 * Cliente de Supabase para el navegador. Solo usa claves públicas (URL + anon).
 * Su único trabajo aquí es la sesión de OAuth Google y el `access_token` (JWT)
 * que `lib/api.ts` adjunta a cada request; TODA la autorización vive en el backend.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
