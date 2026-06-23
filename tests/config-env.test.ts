import { describe, expect, it } from "vitest";
import { parseEnv } from "../lib/config/env";

describe("parseEnv", () => {
  it("usa memory por defecto cuando no se define DATA_SOURCE", () => {
    const env = parseEnv({});
    expect(env.DATA_SOURCE).toBe("memory");
  });

  it("aplica el correo de Control Interno por defecto", () => {
    const env = parseEnv({});
    expect(env.CONTROL_INTERNO_EMAIL).toBe("leonardoreales@americana.edu.co");
  });

  it("rechaza un DATA_SOURCE desconocido", () => {
    expect(() => parseEnv({ DATA_SOURCE: "postgres" })).toThrow();
  });

  it("rechaza un correo de Control Interno inválido", () => {
    expect(() => parseEnv({ CONTROL_INTERNO_EMAIL: "no-es-correo" })).toThrow();
  });

  it("exige las credenciales de Supabase cuando DATA_SOURCE=supabase", () => {
    expect(() => parseEnv({ DATA_SOURCE: "supabase" })).toThrow(/supabase/i);
  });

  it("acepta supabase cuando todas las credenciales están presentes", () => {
    const env = parseEnv({
      DATA_SOURCE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    expect(env.DATA_SOURCE).toBe("supabase");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://abc.supabase.co");
  });

  it("ignora cadenas vacías y aplica los defaults", () => {
    const env = parseEnv({ DATA_SOURCE: "", CONTROL_INTERNO_EMAIL: "" });
    expect(env.DATA_SOURCE).toBe("memory");
    expect(env.CONTROL_INTERNO_EMAIL).toBe("leonardoreales@americana.edu.co");
  });
});
