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

### Polish Pass 1A — Costs UX
Goal: improve the operational cost-entry workflow without changing the underlying cost model.

Scope:
- Move recurring-template creation into the normal cost-entry flow.
- Add a checkbox/toggle for:
  - “save as recurring template”
- When enabled, show recurring-template fields inline:
  - frequency
  - start date
  - end date optional
  - active/inactive if needed
- Keep `cost_templates` and `cost_entries` as separate underlying records.
- Saving a cost with recurring enabled should create:
  - the current cost entry
  - the recurring template

#### Cost field behavior
- Prefill cost date with today by default.
- `quantity` and `unit_price` may be empty.
- UI should compute the missing third field when possible:
  - quantity + unit_price → total_amount
  - quantity + total_amount → unit_price
- Do not aggressively overwrite fields the user is actively editing.
- Backend still treats `total_amount` as the accounting truth on save.

#### Recurring suggestions UX
Recurring suggestions should support:
- Accept
- Edit & accept
- Skip

Meaning of skip:
- skip only that occurrence
- do not disable or delete the template

#### Forward-looking recurring costs
Add a compact read-only overview for recurring costs:
- next 7 days
- next 30 days

This should remain lightweight and not become a large scheduler UI.

#### Template lifecycle
Prefer:
- active / inactive

Do not make delete the primary recurring-template control.

---

### Polish Pass 1B — Admin Macedonian
Goal: translate the user-facing admin UI to Macedonian and make Macedonian the default admin language.

Scope:
- Translate user-facing admin UI labels, messages, buttons, headings, and help text.
- Keep translations aligned in tone with the public landing page.
- Macedonian should be the default language.
- Only user-facing admin UI needs translation.
- Do not change business logic in this pass.

Notes:
- Internal technical values and schema names do not need to change.
- Keep translation work separate from business-logic changes where possible.

---

### Polish Pass 1C — Docs refresh
Goal: keep Codex and the repo aligned with the actual implemented MVP and current polish direction.

Scope:
- Add/update `MVP_CURRENT_STATE.md`
- Keep original MVP planning docs as historical references
- Lightly update:
  - `IMPLEMENTATION_PLAN.md`
  - `PRODUCT_SCOPE.md`
  - `DATA_MODEL.md`
  - `BUSINESS_RULES.md`
  - `CODEX_GUARDRAILS.md`
- Keep `STABILITY_BACKLOG.md` current

Principle:
- Do not rewrite all docs from scratch
- Update only what is misleading or now part of the implemented current state

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

### Polish Pass 1D — Homepage public-note behavior

Goal: make homepage behavior consistent and predictable when the public note is disabled.

Scope:
- When `homepage_public_note_enabled = false`:
  - homepage must fully fall back to the standard derived values:
    - today eggs
    - yesterday eggs
    - chicken count
    - availability message
- No stale or previously entered public note should remain visible.

Admin UX:
- In the dashboard toggle section:
  - clearly indicate that disabling the public note restores default homepage behavior
- Optionally show helper text:
  - “When disabled, the homepage shows only live production data and availability.”

Data behavior:
- `public_note` remains stored in daily_logs
- visibility is controlled only by the toggle
- no data deletion or mutation should occur when toggling off

Principle:
- toggle controls visibility only, not data
- homepage always has a deterministic fallback state