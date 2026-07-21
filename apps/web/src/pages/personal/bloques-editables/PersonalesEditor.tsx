import { useState } from "react"
import { toast } from "sonner"
import { GENEROS, GENERO_LABEL } from "@pys/shared"
import type { DatosPersonales, Genero } from "@pys/shared"
import { useGuardarPersonales } from "../../../hooks/usePersonal"
import { BotonAbrir, FilaGuardarCancelar, inputCls, labelCls, labelTextCls, mensajeError } from "./compartido"

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
        <label className={labelCls}>
          <span className={labelTextCls}>Fecha de expedición</span>
          <input
            type="date"
            value={fechaExpedicion}
            onChange={(ev) => setFechaExpedicion(ev.target.value)}
            disabled={guardar.isPending}
            className={inputCls}
          />
        </label>
        <input
          value={lugarExpedicion}
          maxLength={160}
          onChange={(ev) => setLugarExpedicion(ev.target.value)}
          placeholder="Lugar de expedición"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <label className={labelCls}>
          <span className={labelTextCls}>Fecha de nacimiento</span>
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(ev) => setFechaNacimiento(ev.target.value)}
            disabled={guardar.isPending}
            className={inputCls}
          />
        </label>
        <input
          value={lugarNacimiento}
          maxLength={160}
          onChange={(ev) => setLugarNacimiento(ev.target.value)}
          placeholder="Lugar de nacimiento"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <select
          value={genero}
          onChange={(ev) => setGenero(ev.target.value as Genero | "")}
          disabled={guardar.isPending}
          className={inputCls}
        >
          <option value="">Género (sin especificar)</option>
          {GENEROS.map((g) => (
            <option key={g} value={g}>
              {GENERO_LABEL[g]}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={correoPersonal}
          maxLength={200}
          onChange={(ev) => setCorreoPersonal(ev.target.value)}
          placeholder="Correo personal"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={direccion}
          maxLength={200}
          onChange={(ev) => setDireccion(ev.target.value)}
          placeholder="Dirección"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={barrio}
          maxLength={120}
          onChange={(ev) => setBarrio(ev.target.value)}
          placeholder="Barrio"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={municipio}
          maxLength={120}
          onChange={(ev) => setMunicipio(ev.target.value)}
          placeholder="Municipio"
          disabled={guardar.isPending}
          className={inputCls}
        />
      </div>
      <FilaGuardarCancelar
        pending={guardar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}
