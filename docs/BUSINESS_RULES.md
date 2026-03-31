# Jajce Admin/Dashboard MVP — Business Rules

## 1. Daily production rules
The admin fills these daily outcome fields:
- `eggs_collected_for_sale`
- `eggs_used_other_purpose`
- `eggs_broken`
- `eggs_unusable_other`
- `chicken_count`
- optional `public_note`
- optional internal `notes`

The system auto-calculates:
- `eggs_total_yield`

Formula:
`eggs_total_yield = eggs_collected_for_sale + eggs_used_other_purpose + eggs_broken + eggs_unusable_other`

MVP UX rule:
- `eggs_total_yield` should be read-only and auto-filled.

## 2. Inventory rules
### Goal
Inventory answers:
- how many sellable eggs are available right now

### Source of truth
- `inventory_transactions`

### Allowed stock effects
- `collected` → `+quantity`
- `reserved` → `-quantity`
- `released` → `+quantity`
- `sold` → `-quantity`
- `manual_adjustment` → signed quantity

### Important exclusions
Do not create inventory rows for:
- `eggs_total_yield`
- `eggs_used_other_purpose`
- `eggs_broken`
- `eggs_unusable_other`

Reason:
- only `eggs_collected_for_sale` enters sellable stock

### Available eggs formula
`available_eggs = sum(all inventory transaction effects)`

### Safety goals
- avoid duplicate stock movements
- avoid double reduction when reserved orders later complete
- support manual adjustments safely

## 3. Daily log → inventory rules
When a daily log is created or updated:
- create or reconcile a `collected` inventory transaction based on `eggs_collected_for_sale`
- do not create inventory transactions for other daily outcome fields

Important implementation rule:
- daily log edits must reconcile inventory safely
- do not simply append duplicate `collected` rows on edits

## 4. Order lifecycle rules
### Statuses
- `reserved`
- `completed`
- `cancelled`

### Create reserved order
When an order is created with `status = reserved`:
- create order row
- create inventory transaction `reserved`

### Create direct completed order
When an order is created with `status = completed`:
- create order row
- create inventory transaction `sold`
- if available, set `fulfilled_at`; otherwise use reasonable default behavior in implementation

### Reserved → completed
When an order changes from `reserved` to `completed`:
- update `status`
- set `fulfilled_at`
- do NOT create another stock reduction

Reason:
- stock already left available inventory at reservation time

### Reserved → cancelled
When an order changes from `reserved` to `cancelled`:
- create inventory transaction `released`

### Completed orders
- completed orders should not be normally cancellable in MVP
- admin correction/edit must still be supported for mistakes
- any edit affecting stock must reconcile inventory safely via service logic

### Future date support
- `target_fulfillment_date` exists now for later booking-by-date capability

## 5. Revenue recognition rules
Revenue is recognized:
- by `fulfilled_at` when present
- otherwise by `date`

Daily revenue formula:
- sum `orders.total_price`
- only for orders where `status = completed`
- recognized on the applicable date above

## 6. Sold quantity rules
Daily sold eggs should come from:
- sum of completed `orders.quantity`

Do not use inventory ledger as the primary sales-truth source for this KPI.

## 7. Cost rules
### Cost entries
`cost_entries` are actual accepted/booked costs.

### Cost templates
`cost_templates` generate suggestions only.
Accepted suggestions become real `cost_entries`.

### Cost truth
For margin calculations:
- `total_amount` is always the accounting truth

### Cost typing
- `direct`
- `allocated`

### Source typing
Keep `source_type` in `cost_entries`:
- `manual`
- `template`

### Later enhancement to remember
Recurring cost suggestions may later remain pending until explicitly accepted/rejected.
Do not build that now, but keep the design compatible.

## 8. Margin formulas
### Daily direct cost
sum of `cost_entries.total_amount` for that day where `cost_type = direct`

### Daily allocated cost
sum of `cost_entries.total_amount` for that day where `cost_type = allocated`

### Daily total cost
`daily_direct_cost + daily_allocated_cost`

### Daily gross margin
`daily_revenue - daily_total_cost`

### Daily direct margin
`daily_revenue - daily_direct_cost`

### Cost per collected-for-sale egg
`daily_total_cost / eggs_collected_for_sale`
if `eggs_collected_for_sale > 0`, else null

### Margin per sold egg
`daily_gross_margin / daily_sold_eggs`
if `daily_sold_eggs > 0`, else null

### Productivity metrics
`total_yield_per_chicken = eggs_total_yield / chicken_count`
if `chicken_count > 0`, else null

`sale_yield_per_chicken = eggs_collected_for_sale / chicken_count`
if `chicken_count > 0`, else null

### Rolling summaries
Support:
- 7-day summary
- 30-day summary

Aggregate at least:
- eggs total yield
- eggs collected for sale
- eggs sold
- revenue
- direct cost
- allocated cost
- total cost
- gross margin

## 9. Homepage sync rules
### Public cards
- `Денес` = today’s `eggs_collected_for_sale`
- `Вчера` = yesterday’s `eggs_collected_for_sale`
- `број на кокошки` = latest `chicken_count`

### Availability message
Use `low_stock_threshold` and current available stock:
- `available_eggs <= 0` → `Моментално нема достапни јајца`
- `available_eggs > 0` and `available_eggs <= low_stock_threshold` → `Ограничена достапност`
- `available_eggs > low_stock_threshold` → `Достапни се свежи јајца`

### Public note
If:
- `homepage_public_note_enabled = true`
- and today’s `public_note` exists

then it may be shown on homepage.

Important:
- this must have an admin toggle in settings
- include this in implementation planning

### Public intake
MVP public intake is notify-only.
Contacts may later gain richer preference flows.

## 10. Notifications rules
### MVP sending
- email sending only

### Schema readiness
The system must already support channels in schema for:
- email
- viber
- whatsapp

### Audience types
- subscribers
- waiting list
- active customers
- selected contacts

### Delivery history
Store recipient-level delivery outcome rows.

## 11. Auth rules
- local email/password auth for MVP
- keep implementation structured so broader user auth can evolve later
- do not overbuild multi-role auth now

## 12. Dashboard rules
Support two modes.

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
Includes simple mode plus:
- total yield per chicken
- sale yield per chicken
- direct cost
- allocated cost
- 7-day gross margin
- 30-day gross margin
- cost by category
