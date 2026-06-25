import { describe, expect, it } from "vitest";
import { decidirAltaUsuario } from "../src/usuarios";

const BASE = {
  nombre: "Persona Prueba",
  superadminEmail: "leonardoreales@americana.edu.co",
  dominioPermitido: "americana.edu.co",
};

describe("decidirAltaUsuario", () => {
  it("rechaza correos fuera del dominio permitido", () => {
    const d = decidirAltaUsuario({ ...BASE, email: "ajeno@gmail.com" });
    expect(d.permitido).toBe(false);
  });

  it("da SUPERADMIN/ACTIVO al correo del superadmin", () => {
    const d = decidirAltaUsuario({
      ...BASE,
      email: "leonardoreales@americana.edu.co",
    });
    expect(d).toMatchObject({ permitido: true, rol: "SUPERADMIN", estado: "ACTIVO" });
  });

  it("da PENDIENTE a cualquier otro correo del dominio", () => {
    const d = decidirAltaUsuario({ ...BASE, email: "fulanito@americana.edu.co" });
    expect(d).toMatchObject({ permitido: true, estado: "PENDIENTE" });
  });

  it("es insensible a mayúsculas y espacios en el correo", () => {
    const d = decidirAltaUsuario({
      ...BASE,
      email: "  LEONARDOREALES@Americana.Edu.Co  ",
    });
    expect(d).toMatchObject({ permitido: true, rol: "SUPERADMIN" });
  });

  it("no acepta un subdominio falso que termine en el dominio", () => {
    const d = decidirAltaUsuario({
      ...BASE,
      email: "atacante@evilamericana.edu.co",
    });
    expect(d.permitido).toBe(false);
  });

  it("fail-closed: rechaza si el dominio permitido está vacío (env mal configurada)", () => {
    const d = decidirAltaUsuario({
      ...BASE,
      dominioPermitido: "",
      email: "fulanito@americana.edu.co",
    });
    expect(d.permitido).toBe(false);
  });

  it("no crashea si el superadminEmail está vacío: entra como PENDIENTE", () => {
    const d = decidirAltaUsuario({
      ...BASE,
      superadminEmail: "",
      email: "fulanito@americana.edu.co",
    });
    expect(d).toMatchObject({ permitido: true, rol: "AREA", estado: "PENDIENTE" });
  });
});
