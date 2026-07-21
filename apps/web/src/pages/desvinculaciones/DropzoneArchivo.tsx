import { useRef, useState } from "react"

/**
 * Zona de arrastrar-o-elegir un único archivo Excel (.xlsx/.xls). Presentacional
 * puro: reporta el `File` elegido al padre vía `onArchivo`, sin subirlo.
 */
export function DropzoneArchivo({
  onArchivo,
  disabled = false,
}: {
  onArchivo: (archivo: File) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)

  function elegirArchivo(lista: FileList | null) {
    const archivo = lista?.[0]
    if (archivo) onArchivo(archivo)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setArrastrando(true)
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastrando(false)
        if (!disabled) elegirArchivo(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click()
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-silver-200 bg-silver-50 opacity-60"
          : arrastrando
            ? "border-gold-400 bg-gold-50"
            : "border-silver-300 bg-white hover:border-gold-300 hover:bg-silver-50"
      }`}
    >
      <span aria-hidden className="text-2xl">
        ↑
      </span>
      <p className="text-sm font-medium text-navy-800">
        Arrastra el Excel de desvinculaciones o haz clic para elegirlo
      </p>
      <p className="text-xs text-silver-600">
        Columnas esperadas: Documento, Nombre Completo, Fecha Retiro, Cargo (opcional)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        disabled={disabled}
        onChange={(e) => elegirArchivo(e.target.files)}
        className="sr-only"
      />
    </div>
  )
}
