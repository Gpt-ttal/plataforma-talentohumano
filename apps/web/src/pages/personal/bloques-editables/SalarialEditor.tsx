import { useState } from "react"
import { toast } from "sonner"
import type { DatosSalariales } from "@pys/shared"
import { useGuardarSalarial } from "../../../hooks/usePersonal"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "./compartido"

// ── Bloque salarial (1-1, SENSIBLE) ───────────────────────────────────────────

export function SalarialEditor({
  empleadoId,
  salarial,
}: {
  empleadoId: string
  salarial: DatosSalariales | null
}) {
  const guardar = useGuardarSalarial()
  const [abierto, setAbierto] = useState(false)
  const [salarioBasico, setSalarioBasico] = useState(salarial?.salarioBasico?.toString() ?? "")
  const [auxilioTransporte, setAuxilioTransporte] = useState(
    salarial?.auxilioTransporte?.toString() ?? "",
  )
  const [promedioDevengado, setPromedioDevengado] = useState(
    salarial?.promedioDevengado?.toString() ?? "",
  )
  const [honorarios, setHonorarios] = useState(salarial?.honorarios?.toString() ?? "")
  const [valorEnLetras, setValorEnLetras] = useState(salarial?.valorEnLetras ?? "")
  const [eps, setEps] = useState(salarial?.eps ?? "")
  const [afp, setAfp] = useState(salarial?.afp ?? "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "salarial-editor")

  async function confirmar() {
    setError(null)
    try {
      await guardar.mutateAsync({
        id: empleadoId,
        input: {
          salarioBasico: salarioBasico === "" ? null : Number(salarioBasico),
          auxilioTransporte: auxilioTransporte === "" ? null : Number(auxilioTransporte),
          promedioDevengado: promedioDevengado === "" ? null : Number(promedioDevengado),
          honorarios: honorarios === "" ? null : Number(honorarios),
          valorEnLetras: valorEnLetras.trim() || null,
          eps: eps.trim() || null,
          afp: afp.trim() || null,
        },
      })
      toast.success("Información salarial actualizada.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la información salarial."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar información salarial</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-hairline bg-surface-2 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Salario básico">
          <input
            type="number"
            min={0}
            value={salarioBasico}
            onChange={(ev) => setSalarioBasico(ev.target.value)}
            placeholder="p. ej. 2500000"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Auxilio de transporte">
          <input
            type="number"
            min={0}
            value={auxilioTransporte}
            onChange={(ev) => setAuxilioTransporte(ev.target.value)}
            placeholder="p. ej. 162000"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Promedio devengado">
          <input
            type="number"
            min={0}
            value={promedioDevengado}
            onChange={(ev) => setPromedioDevengado(ev.target.value)}
            placeholder="p. ej. 2800000"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Honorarios (OPS)">
          <input
            type="number"
            min={0}
            value={honorarios}
            onChange={(ev) => setHonorarios(ev.target.value)}
            placeholder="p. ej. 3000000"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="EPS">
          <input
            value={eps}
            maxLength={120}
            onChange={(ev) => setEps(ev.target.value)}
            placeholder="Entidad de salud"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="AFP">
          <input
            value={afp}
            maxLength={120}
            onChange={(ev) => setAfp(ev.target.value)}
            placeholder="Fondo de pensiones"
            disabled={guardar.isPending}
            className={inputCls}
          />
        </CampoForm>
      </div>
      <CampoForm label="Valor en letras (opcional)">
        <input
          value={valorEnLetras}
          maxLength={200}
          onChange={(ev) => setValorEnLetras(ev.target.value)}
          placeholder="Dos millones quinientos mil pesos…"
          disabled={guardar.isPending}
          className={`${inputCls} w-full`}
        />
      </CampoForm>
      <FilaGuardarCancelar
        pending={guardar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      <MensajeError>{error}</MensajeError>
    </div>
  )
}
