import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider, useTheme } from "../src/context/ThemeContext"

function ThemeProbe() {
  const { tema, esDark, alternar } = useTheme()

  return (
    <button type="button" aria-pressed={esDark} onClick={alternar}>
      {tema}
    </button>
  )
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ""
    vi.restoreAllMocks()
  })

  it("inicia desde localStorage, aplica la clase dark y persiste al alternar", async () => {
    localStorage.setItem("pys_theme", "dark")

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    const button = screen.getByRole("button", { name: "dark" })
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(document.documentElement).toHaveClass("dark")

    await userEvent.click(button)

    expect(screen.getByRole("button", { name: "light" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(document.documentElement).not.toHaveClass("dark")
    expect(localStorage.getItem("pys_theme")).toBe("light")
  })
})
