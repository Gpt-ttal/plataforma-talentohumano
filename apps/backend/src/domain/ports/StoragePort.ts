export interface UrlSubidaFoto {
  /** Ruta del objeto dentro del bucket privado (se persiste como `foto_path`). */
  path: string
  /** URL firmada de un solo uso para el `PUT` directo del navegador al bucket. */
  signedUrl: string
  /** Token de la URL firmada (lo exige el SDK del cliente para completar la subida). */
  token: string
}

/**
 * Frontera hacia Supabase Storage. El backend nunca ve los bytes de la foto:
 * genera una URL de subida firmada, el navegador sube directo al bucket privado
 * `fotos-empleados`, y el frontend reporta la ruta resultante vía `guardarFoto`.
 */
export interface StoragePort {
  crearUrlSubidaFoto(funcionarioId: string, extension: string): Promise<UrlSubidaFoto>
  /** URL firmada de lectura de corta duración para pintar la foto en el expediente. */
  crearUrlLecturaFoto(path: string): Promise<{ url: string }>
}
