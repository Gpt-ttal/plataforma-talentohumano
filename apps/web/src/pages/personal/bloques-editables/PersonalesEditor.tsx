import { useState } from "react"
import { toast } from "sonner"
import { GENEROS, GENERO_LABEL } from "@pys/shared"
import type { DatosPersonales, Genero } from "@pys/shared"
import { useGuardarPersonales } from "../../../hooks/usePersonal"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "./compartido"

// ── Bloque personal (1-1) ────────────────────────────────────────────────────

export function PersonalesEditor({
  empleadoId,
  personales,
}: {
  empleadoId: string
  personales: DatosPersonales | null
}) {
  const guardar = useGuardarPersonales()
  const [abierto, setAbierto] = useState(false)
  const [fechaExpedicion, setFechaExpedicion] = useState(personales?.fechaExpedicion ?? "")
  const [lugarExpedicion, setLugarExpedicion] = useState(personales?.lugarExpedicion ?? "")
  const [fechaNacimiento, setFechaNacimiento] = useState(personales?.fechaNacimiento ?? "")
  const [lugarNacimiento, setLugarNacimiento] = useState(personales?.lugarNacimiento ?? "")
  const [genero, setGenero] = useState<Genero | "">(personales?.genero ?? "")
  const [direccion, setDireccion] = useState(personales?.direccion ?? "")
  const [barrio, setBarrio] = useState(personales?.barrio ?? "")
  const [municipio, setMunicipio] = useState(personales?.municipio ?? "")
  const [correoPersonal, setCorreoPersonal] = useState(personales?.correoPersonal ?? "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "personales-editor")

  async function confirmar() {
    setError(null)
    try {
      await guardar.mutateAsync({
        id: empleadoId,
        input: {
          fechaExpedicion: fechaExpedicion || null,
          lugarExpedicion: lugarExpedicion.trim() || null,
          fechaNacimiento: fechaNacimiento || null,
          lugarNacimiento: lugarNacimiento.trim() || null,
          genero: genero || null,
          direccion: direccion.trim() || null,
          barrio: barrio.trim() || null,
          municipio: municipio.trim() || null,
          correoPersonal: correoPersonal.trim() || null,
        },
      })
      toast.success("Datos personales actualizados.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudieron guardar los datos personales."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar datos personales</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Fecha de expedición">
          <input
            type="date"
            value={fechaExpedicion}
            onChange={(ev) => setFechaExpedicion(ev.target.value)}
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Lugar de expedición">
          <input
            value={lugarExpedicion}
            maxLength={160}
            onChange={(ev) => setLugarExpedicion(ev.target.value)}
            placeholder="Ciudad de expedición"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Fecha de nacimiento">
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(ev) => setFechaNacimiento(ev.target.value)}
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Lugar de nacimiento">
          <input
            value={lugarNacimiento}
            maxLength={160}
            onChange={(ev) => setLugarNacimiento(ev.target.value)}
            placeholder="Ciudad de nacimiento"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Género">
          <select
            value={genero}
            onChange={(ev) => setGenero(ev.target.value as Genero | "")}
            disabled={guardar.isPending}
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
        <CampoForm label="Correo personal">
          <input
            type="email"
            value={correoPersonal}
            maxLength={200}
            onChange={(ev) => setCorreoPersonal(ev.target.value)}
            placeholder="nombre@correo.com"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Dirección">
          <input
            value={direccion}
            maxLength={200}
            onChange={(ev) => setDireccion(ev.target.value)}
            placeholder="Calle, número"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Barrio">
          <input
            value={barrio}
            maxLength={120}
            onChange={(ev) => setBarrio(ev.target.value)}
            placeholder="Barrio"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Municipio">
          <input
            value={municipio}
            maxLength={120}
            onChange={(ev) => setMunicipio(ev.target.value)}
            placeholder="Municipio"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
      </div>
      <FilaGuardarCancelar
        pending={guardar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      <MensajeError>{error}</MensajeError>
    </div>
  )
}
