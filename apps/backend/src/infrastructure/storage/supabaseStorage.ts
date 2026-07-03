import { randomUUID } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env } from "../../config/env.js"
import type { StoragePort, UrlSubidaFoto } from "../../domain/ports/StoragePort.js"

export const BUCKET_FOTOS_EMPLEADOS = "fotos-empleados"

let admin: SupabaseClient | null = null

/**
 * Cliente admin (service role) creado perezosamente: si el secreto no está
 * configurado, el error solo aparece al intentar usar Storage (fotos es
 * opcional), no al arrancar el servidor.
 */
function clienteAdmin(): SupabaseClient {
  if (admin) return admin
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada: la subida de fotos de empleados requiere este secreto (ver .env.example).",
    )
  }
  admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return admin
}

export const supabaseStorage: StoragePort = {
  async crearUrlSubidaFoto(funcionarioId: string, extension: string): Promise<UrlSubidaFoto> {
    const ext = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg"
    const path = `${funcionarioId}/${randomUUID()}.${ext}`
    const { data, error } = await clienteAdmin()
      .storage.from(BUCKET_FOTOS_EMPLEADOS)
      .createSignedUploadUrl(path)
    if (error || !data) {
      throw new Error(`No se pudo generar la URL de subida: ${error?.message ?? "error desconocido"}`)
    }
    return { path: data.path, signedUrl: data.signedUrl, token: data.token }
  },

  async crearUrlLecturaFoto(path: string): Promise<{ url: string }> {
    const { data, error } = await clienteAdmin()
      .storage.from(BUCKET_FOTOS_EMPLEADOS)
      .createSignedUrl(path, 3600)
    if (error || !data) {
      throw new Error(`No se pudo generar la URL de lectura: ${error?.message ?? "error desconocido"}`)
    }
    return { url: data.signedUrl }
  },
}
