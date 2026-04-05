# Jajce Admin/Dashboard — Post-MVP Polish Plan

## Status
The core MVP is implemented.
This document tracks narrow post-MVP polish/refinement passes so future work stays scoped and does not drift back into broad MVP-building work.

## Polish working rules
- Keep changes narrow and operationally useful.
- Preserve the existing homepage and current admin architecture.
- Prefer service-layer correctness over UI-only behavior.
- Do not add broad new product scope unless explicitly approved.
- Keep exact stock admin-only.
- Keep homepage soft-message-only.
- Treat polish work as small focused passes.

## Planned polish passes

### Polish Pass 1A — Costs UX ✅ Completed
Goal: improve the operational cost-entry workflow without changing the underlying cost model.

Implemented:
- recurring-template creation moved into the normal cost-entry flow
- inline recurring-template fields in the cost-entry form
- `quantity` / `unit_price` / `total_amount` helper behavior in UI
- date in costs prefilled with today
- recurring suggestions now support:
  - Accept
  - Edit & accept
  - Skip
- skip is per-occurrence only
- compact read-only recurring overview for:
  - next 7 days
  - next 30 days
- recurring-template lifecycle is now oriented around:
  - active / inactive
- cost templates are no longer the primary admin workflow
- when a recurring template is created from a booked cost on date X, that same occurrence is automatically treated as handled and does not reappear as pending on that date

Notes:
- `cost_templates` and `cost_entries` remain separate underlying records
- `total_amount` remains backend truth on save

---

### Polish Pass 1B — Admin Macedonian + bilingual admin UI ✅ Completed
Goal: translate the admin UI to Macedonian, keep Macedonian as default, and add a safe bilingual admin switch.

Implemented:
- user-facing admin UI translated to Macedonian
- Macedonian remains the default admin language
- bilingual admin UI now supports:
  - `mk`
  - `en`
- admin language is SSR-safe and cookie-based
- admin language switch added in the header
- logout moved into the same top-right header control area
- English app label remains:
  - `Jajce Admin`
- Macedonian app label is:
  - `Jajce Администратор`

Notes:
- this pass stayed UI-text-only
- internal enum values, routes, query params, schema/service identifiers, and business logic remain unchanged
- public homepage language handling was not changed by this pass

---

### Polish Pass 1C — Docs refresh ✅ Completed
Goal: keep Codex and the repo aligned with the actual implemented MVP and current polish direction.

Implemented:
- current-state docs refreshed
- original MVP planning docs preserved as historical references
- key docs updated so future work uses the actual implemented system as context

---

## Current approved polish decisions

### Costs UX
- Saving a cost with recurring enabled should create:
  - the current cost entry
  - the recurring template
- `quantity` and `unit_price` may be empty
- UI computes the missing third field when possible
- `total_amount` remains backend truth on save
- Date in costs should be prefilled with today
- Forward-looking recurring costs should be shown compactly for:
  - next 7 days
  - next 30 days
- Recurring suggestions should support:
  - Accept
  - Edit & accept
  - Skip
- Skip means:
  - skip only that occurrence
- Recurring templates should prefer:
  - active / inactive
  over delete as the primary control

### Admin localization
- Translate only user-facing admin UI
- Macedonian should be default
- Keep translation tone aligned with the landing page

### Admin language switch / header
- admin language is cookie-based and SSR-safe
- Macedonian is the default
- English app label remains:
  - `Jajce Admin`
- Macedonian app label is:
  - `Jajce Администратор`
- language switch uses the same visual style direction as the public page
- logout lives in the same top-right header area as the language switch

---

## Not part of this polish plan unless explicitly approved
- public recurring subscription UI
- Viber / WhatsApp real sending
- resend systems
- analytics/dashboard redesign
- customer self-serve accounts
- new permissions model
- queue/outbox architecture
- broad homepage redesign

## Execution guidance for Codex
For polish work:
- use planning-only first
- keep each polish pass narrowly scoped
- avoid touching unrelated flows
- preserve existing service-layer source-of-truth logic
- do not introduce broad architectural changes unless explicitly requested

### Polish Pass 1D — Homepage public-note behavior ⏳ Planned
Goal: make homepage behavior consistent and predictable when the public note is disabled.

Planned scope:
- when `homepage_public_note_enabled = false`:
  - homepage must fully fall back to the standard derived values:
    - today eggs
    - yesterday eggs
    - chicken count
    - availability message
- no stale or previously entered public note should remain visible

Admin UX:
- in the dashboard toggle section:
  - clearly indicate that disabling the public note restores default homepage behavior
- optionally show helper text:
  - “When disabled, the homepage shows only live production data and availability.”

Data behavior:
- `public_note` remains stored in daily_logs
- visibility is controlled only by the toggle
- no data deletion or mutation should occur when toggling off

Principle:
- toggle controls visibility only, not data
- homepage always has a deterministic fallback state

### Polish Pass 1E — Admin language switch + header polish ✅ Completed
Goal: add a safe admin language switch and improve the protected admin header layout.

Implemented:
- cookie-only admin language source of truth
- SSR-safe language switching for server-rendered admin pages
- top-right header cluster with:
  - language switch
  - logout
- clean protected admin header layout with:
  - app/admin identity on the left
  - switch + logout on the right
  - nav row below
- current admin URL and search params are preserved when switching language

Rules kept:
- no route-based language system
- no localStorage-based admin language source of truth
- no heavy i18n framework
- no business-logic changes
