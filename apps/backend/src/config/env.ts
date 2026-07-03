import { z } from "zod"

const WEB_ORIGIN_DEFECTO = "http://localhost:5173"

const schema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().url(),
    SUPABASE_URL: z.string().url(),
    // Opcional: el proyecto migró a JWT Signing Keys asimétricas (ES256, vía JWKS).
    // El secreto HS256 legacy solo se usa como fallback para tokens viejos/tests.
    SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    // Opcional: solo requerido para el bucket privado de fotos de empleados
    // (Storage). Sin este secreto, `crearUrlSubidaFoto` falla con un mensaje claro
    // en vez de bloquear el arranque — el resto del módulo funciona sin fotos.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPERADMIN_EMAIL: z.string().email().default("leonardoreales@americana.edu.co"),
    CONTROL_INTERNO_EMAIL: z.string().email().default("leonardoreales@americana.edu.co"),
    DOMINIO_PERMITIDO: z.string().default("americana.edu.co").transform((v) => v.toLowerCase()),
    PORT: z.coerce.number().default(3000),
    WEB_ORIGIN: z.string().url().default(WEB_ORIGIN_DEFECTO),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  // Endurecimiento de producción: en lugar de degradar a defaults silenciosos
  // (localhost, ssl sin verificar, secreto compartido), el arranque FALLA si la
  // configuración no es segura cuando NODE_ENV=production.
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return
    if (data.WEB_ORIGIN === WEB_ORIGIN_DEFECTO) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WEB_ORIGIN"],
        message: "En producción WEB_ORIGIN debe apuntar al origen real del frontend (no localhost).",
      })
    }
    if (/sslmode=no-verify/i.test(data.DATABASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "En producción no use sslmode=no-verify (use require o verify-full): el cert del servidor debe validarse.",
      })
    }
    if (data.SUPABASE_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUPABASE_JWT_SECRET"],
        message: "En producción no configure SUPABASE_JWT_SECRET: se exige firma asimétrica (JWKS) para cerrar el algorithm-confusion.",
      })
    }
  })

export type Env = z.infer<typeof schema>

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => `  · ${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("\n")
    throw new Error(`Variables de entorno inválidas:\n${detalle}\nRevisa tu .env (ver .env.example).`)
  }
  return parsed.data
}

export const env: Env = parseEnv()
