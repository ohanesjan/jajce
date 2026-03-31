# Jajce Admin/Dashboard MVP — Codex Guardrails

## Highest priority constraints
- Preserve the existing homepage at jajce.mk.
- Do not redesign the homepage from scratch.
- Implement incrementally in phases.
- Prioritize correctness of schema and business logic over UI speed.
- Keep exact stock admin-only.
- Public homepage shows soft availability messaging only.

## Implementation boundaries
- Do not build the full system in one shot.
- Do not skip schema/domain logic and jump straight to UI.
- Do not add speculative abstractions unless they clearly reduce risk.
- Do not overbuild auth or permissions.
- Do not add customer self-serve accounts in MVP.

## Data/business constraints
- `eggs_total_yield` must be auto-calculated from the other egg outcome fields.
- Inventory must track only sellable stock.
- Only `eggs_collected_for_sale` enters inventory.
- `reserved -> completed` must not double-reduce stock.
- Direct completed orders must be supported.
- Completed orders are not normally cancellable in MVP, but admin correction/edit must be supported.
- Keep `source_type` in `cost_entries`.
- Cost templates are suggestion definitions, not booked costs.
- Design recurring cost flow so pending suggestion behavior can be added later.

## Public sync constraints
- Homepage `Денес` and `Вчера` must use `eggs_collected_for_sale`.
- Homepage chicken count must come from latest daily log.
- Public note can appear only if:
  - today’s `public_note` exists
  - and `homepage_public_note_enabled = true`
- There must be an admin toggle for `homepage_public_note_enabled`.

## Notification constraints
- Real sending in MVP is email only.
- Schema must already support channels for email, viber, whatsapp.
- Preserve per-recipient delivery history.
- Store the destination actually used.

## Dashboard constraints
- Support simple and expanded dashboard modes.
- Do not compute core business metrics directly in UI components.
- Use service/query/domain helpers.

## Testing requirements
Every implementation phase should include tests where appropriate, especially for:
- inventory math
- daily log reconciliation
- revenue recognition
- margin calculations
- order lifecycle stock effects

## Output behavior requested from Codex
For any implementation task, Codex should first provide:
1. short implementation plan
2. files to change/create
3. key assumptions/risks
4. then code

## Architectural tone
- Favor minimal, clear, maintainable implementation.
- Follow existing project patterns.
- Prefer explicit business services for critical workflows.
- Use transactions for stock/order reconciliation logic where needed.
