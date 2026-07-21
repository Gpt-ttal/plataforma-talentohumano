# Superadmin Activos Fijos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct Superadmin navigation entry for the Activos fijos area queue without changing the user's role or area assignment.

**Architecture:** Reuse the existing `/paz-y-salvo/mi-area` page and backend authorization. The only production change is the Superadmin sidebar item: label `Activos fijos`, href `/paz-y-salvo/mi-area?area=1`.

**Tech Stack:** React 18, React Router 6, TypeScript, Vitest, Testing Library.

## Global Constraints

- Do not create a new role.
- Do not assign `areaId` to `SUPERADMIN`.
- Do not change backend guards or migrations.
- Do not commit unless the user explicitly asks.

---

### Task 1: Superadmin Navigation Link

**Files:**
- Create: `apps/web/tests/Layout.test.tsx`
- Modify: `apps/web/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `Layout` from `apps/web/src/components/Layout.tsx`
- Produces: Superadmin nav item with accessible link text `Activos fijos` and href `/paz-y-salvo/mi-area?area=1`

- [ ] **Step 1: Write the failing test**

```tsx
it("muestra a SUPERADMIN el acceso directo a Activos fijos", () => {
  useAuthMock.mockReturnValue({
    usuario: usuario({ rol: "SUPERADMIN", areaId: null }),
  })

  renderEn("/inicio")

  const link = screen.getByRole("link", { name: /Activos fijos/i })
  expect(link).toHaveAttribute("href", "/paz-y-salvo/mi-area?area=1")
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=apps/web -- Layout.test.tsx`

Expected: FAIL because there is no `Activos fijos` link yet.

- [ ] **Step 3: Write minimal implementation**

Change the Superadmin item currently labeled `Bandejas por area`:

```tsx
{
  href: "/paz-y-salvo/mi-area?area=1",
  label: "Activos fijos",
  icon: "area",
  active: (p) => p.startsWith("/paz-y-salvo/mi-area"),
  status: "live",
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=apps/web -- Layout.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run focused safety checks**

Run: `npm run typecheck --workspace=apps/web`

Expected: exit 0.

Run: `npm run test --workspace=apps/web`

Expected: all web tests pass.

## Self-Review

- Spec coverage: The plan covers the direct Superadmin entry and avoids role, backend, and migration changes.
- Placeholder scan: No TBD/TODO/placeholders.
- Type consistency: The tested link text and href match the implementation target.
