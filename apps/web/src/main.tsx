import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./index.css"

/**
 * Punto de entrada del SPA. El árbol de providers (Router → Query → Auth) se
 * arma en `App.tsx` (Fase 5.3) para que `main` quede mínimo y estable.
 */
const root = document.getElementById("root")
if (!root) throw new Error("No se encontró el elemento #root")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
