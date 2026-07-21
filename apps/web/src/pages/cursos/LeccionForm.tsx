import { useState } from "react"
import type { ReactNode } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import type { Leccion, TipoContenidoLeccion } from "@pys/shared"
import { TIPO_CONTENIDO_LABEL } from "@pys/shared"

/**
 * Clases de tipografía para el HTML de una lección de texto — se aplican tanto
 * al editor Tiptap (aquí) como al render público en `TomarCursoPage` (Fase 7,
 * vía `dangerouslySetInnerHTML`), para que el contenido se vea igual en ambos
 * lados. Exportada para que Fase 7 la reutilice sin duplicar estilos.
 */
export const PROSE_LECCION_CLS =
  "[&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-navy-900 " +
  "[&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-navy-800 " +
  "[&_p]:my-1.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline " +
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gold-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-silver-600"

export interface LeccionFormValores {
  titulo: string
  tipoContenido: TipoContenidoLeccion
  contenidoTexto?: string
  urlVideo?: string
}

const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Formulario crear/editar lección. Componente puro: no conoce la API, solo
 * reporta `onGuardar(valores)`. `inicial` presente = edición (precarga campos);
 * ausente = creación. El llamador debe pasar `key={leccion.id}` (o similar) al
 * montarlo en modo edición para forzar remount si cambia la lección objetivo —
 * este componente no re-sincroniza `inicial` tras el primer render.
 */
export function LeccionForm({
  inicial,
  guardando,
  onGuardar,
  onCancelar,
}: {
  inicial?: Leccion
  guardando: boolean
  onGuardar: (valores: LeccionFormValores) => void | Promise<void>
  onCancelar: () => void
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "")
  const [tipoContenido, setTipoContenido] = useState<TipoContenidoLeccion>(
    inicial?.tipoContenido ?? "TEXTO",
  )
  const [urlVideo, setUrlVideo] = useState(inicial?.urlVideo ?? "")
  const [error, setError] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Underline],
    content: inicial?.contenidoTexto ?? "",
    editorProps: {
      attributes: {
        class: `${PROSE_LECCION_CLS} min-h-[140px] rounded-b-lg border border-t-0 border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:outline-none`,
      },
    },
  })

  function validar(): string | null {
    if (titulo.trim().length < 2) return "El título debe tener al menos 2 caracteres."
    if (tipoContenido === "VIDEO") {
      if (!urlVideo.trim()) return "Ingresa la URL del video."
      try {
        new URL(urlVideo.trim())
      } catch {
        return "La URL del video no es válida."
      }
    }
    if (tipoContenido === "TEXTO" && (editor?.isEmpty ?? true)) {
      return "El contenido de la lección no puede estar vacío."
    }
    return null
  }

  async function handleGuardar() {
    const msg = validar()
    if (msg) {
      setError(msg)
      return
    }
    setError(null)
    await onGuardar({
      titulo: titulo.trim(),
      tipoContenido,
      contenidoTexto: tipoContenido === "TEXTO" ? (editor?.getHTML() ?? "") : undefined,
      urlVideo: tipoContenido === "VIDEO" ? urlVideo.trim() : undefined,
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
            Título de la lección
          </span>
          <input
            value={titulo}
            maxLength={200}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="p. ej. Introducción"
            disabled={guardando}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
            Tipo de contenido
          </span>
          <div className="flex gap-2">
            {(["TEXTO", "VIDEO"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={guardando}
                onClick={() => setTipoContenido(t)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  tipoContenido === t
                    ? "bg-navy-deep text-white shadow-luxe"
                    : "bg-silver-100 text-silver-600 hover:bg-silver-200"
                }`}
              >
                {TIPO_CONTENIDO_LABEL[t]}
              </button>
            ))}
          </div>
        </label>
      </div>

      {tipoContenido === "VIDEO" ? (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
            URL del video
          </span>
          <input
            type="url"
            value={urlVideo}
            maxLength={500}
            onChange={(e) => setUrlVideo(e.target.value)}
            placeholder="https://youtube.com/watch?v=… · Vimeo · Drive"
            disabled={guardando}
            className={inputCls}
          />
        </label>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
            Contenido
          </span>
          <ToolbarTiptap editor={editor} disabled={guardando} />
          {editor && <EditorContent editor={editor} />}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={guardando}
          onClick={() => void handleGuardar()}
          className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar lección"}
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={onCancelar}
          className="text-xs font-semibold text-silver-600 hover:text-navy-800"
        >
          Cancelar
        </button>
        {error && <p className="text-xs text-estado-rechazo">{error}</p>}
      </div>
    </div>
  )
}

// ── Toolbar Tiptap ──────────────────────────────────────────────────────────

function ToolbarTiptap({
  editor,
  disabled,
}: {
  editor: ReturnType<typeof useEditor>
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-silver-300 bg-silver-50 p-1.5">
      <BotonToolbar
        title="Negrita"
        activo={editor?.isActive("bold") ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </BotonToolbar>
      <BotonToolbar
        title="Cursiva"
        activo={editor?.isActive("italic") ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </BotonToolbar>
      <BotonToolbar
        title="Subrayado"
        activo={editor?.isActive("underline") ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </BotonToolbar>
      <span className="mx-1 h-4 w-px bg-silver-300" aria-hidden />
      <BotonToolbar
        title="Encabezado 2"
        activo={editor?.isActive("heading", { level: 2 }) ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </BotonToolbar>
      <BotonToolbar
        title="Encabezado 3"
        activo={editor?.isActive("heading", { level: 3 }) ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </BotonToolbar>
      <span className="mx-1 h-4 w-px bg-silver-300" aria-hidden />
      <BotonToolbar
        title="Lista con viñetas"
        activo={editor?.isActive("bulletList") ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        •
      </BotonToolbar>
      <BotonToolbar
        title="Lista numerada"
        activo={editor?.isActive("orderedList") ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        1.
      </BotonToolbar>
      <BotonToolbar
        title="Cita"
        activo={editor?.isActive("blockquote") ?? false}
        disabled={disabled || !editor}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        &ldquo;
      </BotonToolbar>
    </div>
  )
}

function BotonToolbar({
  activo,
  disabled,
  onClick,
  title,
  children,
}: {
  activo: boolean
  disabled: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded text-xs font-semibold transition disabled:opacity-40 ${
        activo ? "bg-navy-deep text-white" : "bg-white text-silver-700 hover:bg-silver-200"
      }`}
    >
      {children}
    </button>
  )
}
