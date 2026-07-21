import { useState } from "react"
import { toast } from "sonner"
import type { DatosSalariales } from "@pys/shared"
import { useGuardarSalarial } from "../../../hooks/usePersonal"
import { BotonAbrir, FilaGuardarCancelar, inputCls, mensajeError } from "./compartido"

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
    <div className="mt-3 space-y-3 rounded-lg border border-gold-200/60 bg-gold-50/40 p-3 dark:border-gold-200/20 dark:bg-surface-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="number"
          min={0}
          value={salarioBasico}
          onChange={(ev) => setSalarioBasico(ev.target.value)}
          placeholder="Salario básico"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={auxilioTransporte}
          onChange={(ev) => setAuxilioTransporte(ev.target.value)}
          placeholder="Auxilio de transporte"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={promedioDevengado}
          onChange={(ev) => setPromedioDevengado(ev.target.value)}
          placeholder="Promedio devengado"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={honorarios}
          onChange={(ev) => setHonorarios(ev.target.value)}
          placeholder="Honorarios (OPS)"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={eps}
          maxLength={120}
          onChange={(ev) => setEps(ev.target.value)}
          placeholder="EPS"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={afp}
          maxLength={120}
          onChange={(ev) => setAfp(ev.target.value)}
          placeholder="AFP"
          disabled={guardar.isPending}
          className={inputCls}
        />
      </div>
      <input
        value={valorEnLetras}
        maxLength={200}
        onChange={(ev) => setValorEnLetras(ev.target.value)}
        placeholder="Valor en letras (opcional)"
        disabled={guardar.isPending}
        className={`${inputCls} w-full`}
      />
      <FilaGuardarCancelar
        pending={guardar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}
