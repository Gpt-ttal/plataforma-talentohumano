import { useState } from "react"
import { toast } from "sonner"
import { MODALIDADES, MODALIDAD_LABEL, TIPOS_CONTRATO, TIPO_CONTRATO_LABEL } from "@pys/shared"
import type { EmpleadoContractual, Modalidad, TipoContrato } from "@pys/shared"
import { useAreas } from "../../../hooks/useAreas"
import { useEditarContractual } from "../../../hooks/usePersonal"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "./compartido"

// ── Bloque contractual extendido (1-1) ────────────────────────────────────────

export function ContractualEditor({
  empleadoId,
  contractual,
}: {
  empleadoId: string
  contractual: EmpleadoContractual
}) {
  const editar = useEditarContractual()
  const { data: areas } = useAreas()
  const [abierto, setAbierto] = useState(false)
  const [areaId, setAreaId] = useState(contractual.areaId ?? "")
  const [tipoContrato, setTipoContrato] = useState<TipoContrato | "">(contractual.tipoContrato ?? "")
  const [modalidad, setModalidad] = useState<Modalidad | "">(contractual.modalidad ?? "")
  const [programa, setPrograma] = useState(contractual.programa ?? "")
  const [escalafon, setEscalafon] = useState(contractual.escalafon ?? "")
  const [jefeInmediato, setJefeInmediato] = useState(contractual.jefeInmediato ?? "")
  const [fechaPrimerIngreso, setFechaPrimerIngreso] = useState(contractual.fechaPrimerIngreso ?? "")
  const [observacion, setObservacion] = useState(contractual.observacion ?? "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "contractual-editor")

  async function confirmar() {
    setError(null)
    try {
      await editar.mutateAsync({
        id: empleadoId,
        input: {
          areaId: areaId || null,
          tipoContrato: tipoContrato || null,
          modalidad: modalidad || null,
          programa: programa.trim() || null,
          escalafon: escalafon.trim() || null,
          jefeInmediato: jefeInmediato.trim() || null,
          fechaPrimerIngreso: fechaPrimerIngreso || null,
          observacion: observacion.trim() || null,
        },
      })
      toast.success("Datos contractuales actualizados.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudieron guardar los datos contractuales."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar datos contractuales</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Área">
          <select
            value={areaId}
            onChange={(ev) => setAreaId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin asignar</option>
            {(areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Tipo de contrato">
          <select
            value={tipoContrato}
            onChange={(ev) => setTipoContrato(ev.target.value as TipoContrato | "")}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {TIPOS_CONTRATO.map((t) => (
              <option key={t} value={t}>
                {TIPO_CONTRATO_LABEL[t]}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Modalidad">
          <select
            value={modalidad}
            onChange={(ev) => setModalidad(ev.target.value as Modalidad | "")}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {MODALIDAD_LABEL[m]}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Fecha de primer ingreso">
          <input
            type="date"
            value={fechaPrimerIngreso}
            onChange={(ev) => setFechaPrimerIngreso(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Jefe inmediato">
          <input
            value={jefeInmediato}
            maxLength={160}
            onChange={(ev) => setJefeInmediato(ev.target.value)}
            placeholder="Nombre del jefe"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Programa">
          <input
            value={programa}
            maxLength={160}
            onChange={(ev) => setPrograma(ev.target.value)}
            placeholder="Programa o dependencia"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Escalafón">
          <input
            value={escalafon}
            maxLength={80}
            onChange={(ev) => setEscalafon(ev.target.value)}
            placeholder="Categoría / escalafón"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
      </div>
      <CampoForm label="Observación (opcional)">
        <textarea
          value={observacion}
          onChange={(ev) => setObservacion(ev.target.value)}
          placeholder="Nota contractual"
          rows={2}
          maxLength={1000}
          disabled={editar.isPending}
          className={`${inputCls} w-full resize-none`}
        />
      </CampoForm>
      <FilaGuardarCancelar
        pending={editar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      <MensajeError>{error}</MensajeError>
    </div>
  )
}
