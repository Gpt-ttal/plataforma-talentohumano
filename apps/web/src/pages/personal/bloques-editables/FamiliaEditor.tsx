import { useState } from "react"
import { toast } from "sonner"
import { GENEROS, GENERO_LABEL, PARENTESCOS, PARENTESCO_LABEL } from "@pys/shared"
import type { Familiar, Genero, Parentesco } from "@pys/shared"
import { useCrearFamiliar, useEliminarFamiliar } from "../../../hooks/usePersonal"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaEliminable,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "./compartido"

// ── Familia (1-N) ─────────────────────────────────────────────────────────────

export function FamiliaEditor({
  empleadoId,
  familiares,
}: {
  empleadoId: string
  familiares: Familiar[]
}) {
  const crear = useCrearFamiliar()
  const eliminar = useEliminarFamiliar()
  const [abierto, setAbierto] = useState(false)
  const [parentesco, setParentesco] = useState<Parentesco>("HIJO")
  const [nombre, setNombre] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [genero, setGenero] = useState<Genero | "">("")
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)
  useGuardaCierre(abierto, "familia-editor")

  async function agregar() {
    setError(null)
    if (nombre.trim().length < 2) {
      setError("Indica el nombre del familiar.")
      return
    }
    try {
      await crear.mutateAsync({
        id: empleadoId,
        input: {
          parentesco,
          nombre: nombre.trim(),
          ...(fechaNacimiento ? { fechaNacimiento } : {}),
          ...(genero ? { genero } : {}),
        },
      })
      toast.success("Familiar agregado.")
      setNombre("")
      setFechaNacimiento("")
      setGenero("")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar el familiar."))
    }
  }

  async function confirmarEliminar(id: string) {
    try {
      await eliminar.mutateAsync({ id: empleadoId, familiarId: id })
      toast.success("Familiar eliminado.")
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo eliminar el familiar."))
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <div>
      {familiares.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {familiares.map((f) => (
            <FilaEliminable
              key={f.id}
              pending={eliminar.isPending}
              confirmando={aEliminar === f.id}
              onPedirConfirmar={() => setAEliminar(f.id)}
              onCancelarConfirmar={() => setAEliminar(null)}
              onConfirmar={() => void confirmarEliminar(f.id)}
            >
              {f.nombre} <span className="text-silver-600">· {PARENTESCO_LABEL[f.parentesco]}</span>
            </FilaEliminable>
          ))}
        </ul>
      )}

      {!abierto ? (
        <BotonAbrir onClick={() => setAbierto(true)}>Agregar familiar</BotonAbrir>
      ) : (
        <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CampoForm label="Parentesco">
              <select
                value={parentesco}
                onChange={(ev) => setParentesco(ev.target.value as Parentesco)}
                disabled={crear.isPending}
                className={inputCls}
              >
                {PARENTESCOS.map((p) => (
                  <option key={p} value={p}>
                    {PARENTESCO_LABEL[p]}
                  </option>
                ))}
              </select>
            </CampoForm>
            <CampoForm label="Nombre completo">
              <input
                value={nombre}
                maxLength={160}
                onChange={(ev) => setNombre(ev.target.value)}
                placeholder="Nombre y apellidos"
                disabled={crear.isPending}
                aria-invalid={!!error}
                className={inputCls}
              />
            </CampoForm>
            <CampoForm label="Fecha de nacimiento (opcional)">
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(ev) => setFechaNacimiento(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </CampoForm>
            <CampoForm label="Género">
              <select
                value={genero}
                onChange={(ev) => setGenero(ev.target.value as Genero | "")}
                disabled={crear.isPending}
                className={inputCls}
              >
                <option value="">Sin especificar</option>
                {GENEROS.map((g) => (
                  <option key={g} value={g}>
                    {GENERO_LABEL[g]}
                  </option>
                ))}
              </select>
            </CampoForm>
          </div>
          <FilaGuardarCancelar
            pending={crear.isPending}
            guardandoLabel="Agregando…"
            guardarLabel="Agregar"
            onGuardar={() => void agregar()}
            onCancelar={() => setAbierto(false)}
          />
          <MensajeError>{error}</MensajeError>
        </div>
      )}
    </div>
  )
}
