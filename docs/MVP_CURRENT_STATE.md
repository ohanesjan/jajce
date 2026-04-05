# Jajce Admin/Dashboard — Current MVP State

## Status
The MVP is implemented through the original 8 implementation phases.

This file is the current-state reference for the implemented system.
Original phase-planning docs remain useful as historical implementation guidance, but ongoing work should be treated as post-MVP polish/refinement.

## Implemented modules
### Public homepage
The homepage is implemented and wired to backend-derived data for:
- `Денес` = today’s `eggs_collected_for_sale`
- `Вчера` = yesterday’s `eggs_collected_for_sale`
- `број на кокошки` = latest `chicken_count`
- soft availability message only
- optional public note when enabled
- notify-only signup flow

The homepage is explicitly dynamic / non-cached so these values stay fresh.

### Admin
Implemented admin modules:
- login
- dashboard
- daily logs
- costs
- recurring cost templates / recurring cost suggestions
- contacts
- orders
- notifications
- homepage public note toggle on dashboard

## Core implemented workflow rules
### Daily logs
- `eggs_total_yield` is auto-calculated
- live total-yield display exists in the form
- daily-log edits/deletes are blocked when they would unsafely reduce sellable stock already consumed by downstream reservations/sales
- non-destructive corrections remain allowed

### Inventory
- inventory tracks sellable stock only
- `reserved -> completed` does not double-reduce stock
- stock-affecting daily-log and order flows use the same sellable-inventory locking strategy

### Costs
- `cost_entries` are booked/accepted costs
- `cost_templates` are recurring suggestion definitions
- accepted recurring suggestions become normal `cost_entries`
- template-origin booked costs remain linked to their template
- normal manual cost-entry flows default missing `source_type` to `manual`

### Orders
- reserved orders reduce stock
- direct completed orders reduce stock
- reserved -> completed does not reduce stock again
- reserved -> cancelled releases stock
- completed orders are not normally cancellable
- completed-order corrections use a separate guarded path

### Dashboard
Two dashboard modes exist:
- simple
- expanded

### Homepage sync
Homepage values are derived from backend source-of-truth services.
Exact stock remains admin-only.

### Notifications
- campaign drafts exist
- recipient history exists
- actual sending in MVP is email only
- Resend is the current real provider adapter
- `selected_contacts` draft membership is persisted explicitly
- recoverable send-only drafts are supported if recipient snapshotting already happened
- recipient outcomes are persisted incrementally
- campaign becomes:
  - `sent` only if all recipients succeed
  - otherwise `failed`

## Current runtime / implementation choices
- Next.js App Router
- Prisma
- PostgreSQL
- Vitest
- local admin email/password auth
- Resend email provider adapter for notifications

## Known intentional MVP limits
- no public recurring subscription UI yet
- no Viber / WhatsApp real sending yet
- no customer self-serve accounts
- no resend feature
- no analytics suite
- no queue / outbox system
- no advanced delivery scheduling

## Current direction for polish work
Post-MVP work should be treated as narrow polish/refinement passes, not new MVP architecture work.