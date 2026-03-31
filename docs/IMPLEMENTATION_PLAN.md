# Jajce Admin/Dashboard MVP — Recommended Codex Implementation Plan

## Core principle
Do not implement everything at once.
Build in tightly scoped, verifiable phases.

The safest order is:
1. schema and domain logic
2. daily logs and inventory
3. costs and margin
4. contacts and orders
5. dashboard
6. homepage sync
7. notifications
8. corrections and polish

## Phase 0 — repository inspection and execution planning
Before code changes, Codex should:
- inspect the existing repo structure
- identify current homepage files and data flow
- identify current stack/patterns already used
- preserve existing architecture unless a strong reason exists not to
- produce an execution plan before implementing

Output should include:
- phased implementation plan
- likely files to add/change
- assumptions/risks
- questions only if absolutely necessary

## Phase 1 — schema and domain foundation
Implement:
- all schema entities and enums
- foreign keys
- migrations
- default seed/settings
- initial admin seed/bootstrap path
- core domain services/helpers for:
  - total yield calculation
  - inventory availability calculation
  - revenue recognition
  - margin calculations
  - homepage availability message

Tests required:
- formula tests
- enum/schema sanity tests if appropriate
- inventory calculation tests
- margin helper tests

Do not build UI yet.

## Phase 2 — daily logs and inventory slice
Implement:
- daily log CRUD
- daily log validation
- auto-calculated `eggs_total_yield`
- inventory reconciliation from `eggs_collected_for_sale`
- admin daily logs page
- initial dashboard cards for:
  - available eggs
  - today total yield
  - today collected for sale
  - yesterday collected for sale
  - latest chicken count

Critical rules:
- editing a daily log must reconcile inventory safely
- do not duplicate stock rows on edits
- use transactions where necessary

Tests required:
- daily total yield formula
- daily log create/update inventory behavior
- uniqueness of daily log date

## Phase 3 — costs, cost templates, and margin engine
Implement:
- cost template CRUD
- cost entry CRUD
- suggestion-based acceptance flow for recurring templates
- cost aggregation queries/helpers
- margin engine
- margin insights data services

Critical rules:
- `total_amount` is the accounting truth
- accepted recurring suggestions become `cost_entries`
- keep `source_type`
- design so later pending suggestion flow can be added cleanly

Tests required:
- direct vs allocated rollups
- cost-per-egg formulas
- gross/direct margin formulas
- rolling 7-day and 30-day summaries

## Phase 4 — contacts and orders
Implement:
- contacts CRUD
- role flags and customer stage handling
- order CRUD
- reservation flow
- direct completed sale flow
- safe inventory effects for each order lifecycle path
- support default price prefill and manual override
- support `target_fulfillment_date` and `fulfilled_at`

Critical rules:
- `reserved -> completed` must not double-reduce inventory
- `reserved -> cancelled` must release stock
- completed orders are not normally cancellable in MVP
- admin correction/edit flow for completed orders must exist and reconcile inventory safely

Tests required:
- reservation stock reduction
- direct completed sale stock reduction
- reserved to completed no-double-count behavior
- reserved to cancelled release behavior
- completed order edit/correction reconciliation

## Phase 5 — admin dashboard
Implement two modes.

### Simple mode
- available eggs
- today total yield
- today collected for sale
- yesterday collected for sale
- latest chicken count
- today sold eggs
- today revenue
- today total cost
- today gross margin
- subscriber count
- waiting list count
- active customer count

### Expanded mode
- total yield per chicken
- sale yield per chicken
- direct cost
- allocated cost
- 7-day gross margin
- 30-day gross margin
- cost by category

Critical rule:
- do not compute business metrics in UI components
- use backend/service/query helpers

## Phase 6 — homepage integration
Implement:
- homepage data query layer
- wire the existing homepage to backend values for:
  - `Денес`
  - `Вчера`
  - `број на кокошки`
  - availability message
  - notify-only intake
- admin toggle for `homepage_public_note_enabled`
- optional public note rendering

Critical rules:
- preserve current homepage look and structure as much as possible
- do not redesign the homepage
- exact stock remains admin-only
- public page shows only soft availability messaging

## Phase 7 — notifications
Implement:
- campaigns CRUD/drafts
- recipients generation/history
- email sending only
- audience selection by:
  - subscribers
  - waiting list
  - active customers
  - selected contacts

Critical rules:
- schema must stay ready for viber/whatsapp soon after MVP
- store actual destination used
- preserve per-recipient delivery history

Tests required:
- recipient generation rules
- campaign persistence
- delivery status persistence

## Phase 8 — corrections, safeguards, and polish
Implement:
- correction/edit safeguards
- reconciliation helpers
- invalid action handling
- empty states
- admin confirmations for risky actions
- final cleanup and consistency pass

Safety/validation expectations:
- prevent invalid negative stock operations unless explicit manual adjustment policy allows it
- validate order quantities and pricing
- validate notify form and consent combinations
- validate setting toggles and defaults

## Execution style for Codex
For each phase, Codex should:
1. restate scope boundaries
2. inspect relevant current files
3. propose an implementation plan
4. list files to change/create
5. implement only that phase
6. include tests

## Strong guidance
- one phase per Codex task
- do not combine unrelated phases
- do not broad-refactor without necessity
- do not invent a second architecture
- do not redesign the homepage
- prefer minimal safe changes that align with the existing repo
