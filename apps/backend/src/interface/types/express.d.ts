import type { Usuario } from "@pys/shared"

// Aumenta el Request de Express con el usuario autenticado que `requireAuth`
// carga tras verificar el JWT y resolver el autoregistro.
declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario
    }
  }
}

export {}
