/**
 * env.ts — Validación de las variables de entorno con Zod.
 *
 * Fuente única y tipada de la configuración. Valida al arranque (fail-fast):
 * si en producción falta una variable requerida, el error es claro e inmediato
 * en vez de aparecer a mitad de una petición.
 *
 * El resto del código importa `env` (ya validado) en lugar de leer
 * `process.env` crudo y disperso.
 */

import { z } from "zod";

const CONTROL_INTERNO_EMAIL_DEFAULT = "leonardoreales@americana.edu.co";

/** Normaliza el valor crudo: cadena vacía o sólo espacios → `undefined`. */
const limpiar = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** Variable opcional que trata "" como ausente. */
const opcional = z.preprocess(limpiar, z.string().optional());

const esquemaEnv = z
  .object({
    DATA_SOURCE: z
      .preprocess(limpiar, z.enum(["memory", "supabase"]).optional())
      .transform((v) => v ?? "memory"),

    // Supabase (requeridas sólo si DATA_SOURCE=supabase; se valida abajo).
    NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
      limpiar,
      z
        .string()
        .url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida.")
        .optional(),
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: opcional,
    SUPABASE_SERVICE_ROLE_KEY: opcional,

    // Notificación a Control Interno.
    CONTROL_INTERNO_EMAIL: z
      .preprocess(
        limpiar,
        z
          .string()
          .email("CONTROL_INTERNO_EMAIL debe ser un correo válido.")
          .optional(),
      )
      .transform((v) => v ?? CONTROL_INTERNO_EMAIL_DEFAULT),
    RESEND_API_KEY: opcional,
    EMAIL_FROM: opcional,
  })
  .superRefine((val, ctx) => {
    if (val.DATA_SOURCE !== "supabase") return;
    const requeridas = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const;
    for (const clave of requeridas) {
      if (!val[clave]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [clave],
          message: `${clave} es obligatoria cuando DATA_SOURCE=supabase.`,
        });
      }
    }
  });

export type Env = z.infer<typeof esquemaEnv>;

/**
 * Valida un objeto de variables (por defecto `process.env`) y devuelve la
 * configuración tipada. Lanza un error legible si algo no cumple el esquema.
 */
export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
): Env {
  const parsed = esquemaEnv.safeParse(raw);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => `  · ${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas:\n${detalle}\n` +
        "Revisa tu .env.local (ver .env.example).",
    );
  }
  return parsed.data;
}

/** Configuración validada del proceso actual. */
export const env: Env = parseEnv();
