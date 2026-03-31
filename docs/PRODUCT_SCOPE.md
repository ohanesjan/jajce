# Jajce Admin/Dashboard MVP — Product Scope

## Objective
Build a private admin/backoffice system for jajce.mk that manages daily egg production, sellable stock, detailed costs, contacts, orders/reservations, notifications, and dashboard insights, while keeping the existing public homepage and wiring it to backend data.

## Existing public site
- Preserve the existing homepage at jajce.mk.
- Do not redesign it from scratch.
- Extend it carefully so selected public fields are driven by backend/admin data.

## Public-side MVP scope
Keep the existing homepage and make these parts dynamic:
- `Денес` = today’s eggs collected for sale
- `Вчера` = yesterday’s eggs collected for sale
- `број на кокошки` = latest chicken count
- soft availability message
- notify-only signup form
- optional public note, controlled by admin toggle

### Public availability style
Show only a soft message publicly, never the exact stock count.
Suggested states:
- `Моментално нема достапни јајца`
- `Ограничена достапност`
- `Достапни се свежи јајца`

### Public intake
For MVP, keep contact intake simple:
- notify-only form

Later, the system should support:
- weekly frequency
- number of eggs per week
- recurring customer preferences

## Admin-side MVP scope
Build these modules/pages:
- login
- dashboard
- daily logs
- costs
- cost templates
- contacts
- orders
- notifications
- settings
- margin insights

## What the MVP must do
- secure admin login
- log daily production and flock data
- log detailed costs
- support recurring cost templates with suggestion-based acceptance
- track sellable egg inventory
- manage contacts with future-ready preference fields
- create reservations and direct completed sales
- send email notifications
- expose margin insights already in MVP
- sync selected public homepage fields from admin/backend data

## Dashboard requirement
The dashboard must support two modes.

### Simple dashboard view
Show:
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

### Expanded dashboard view
Includes everything from simple mode, plus:
- total yield per chicken
- sale yield per chicken
- direct cost
- allocated cost
- 7-day gross margin
- 30-day gross margin
- cost by category

## Notifications MVP scope
- Real sending in MVP: email only
- Schema must already support channels for:
  - email
  - viber
  - whatsapp
- Phone-channel implementation should come soon after MVP

## Order/booking future readiness
The system should be flexible enough to support later booking for a specific date.
This is why orders include `target_fulfillment_date`.

## Explicitly not in MVP
Do not build these now:
- customer self-serve profiles
- public recurring subscription plans
- Viber/WhatsApp sending
- advanced delivery scheduling
- online payments
- multi-role permissions system
- accounting exports
- forecasting engine

## UX/Product constraints
- Preserve current homepage structure and style as much as possible.
- Exact available egg count stays admin-only.
- Public homepage uses soft availability messaging only.
- Homepage public note must be controlled by an admin toggle.
- The system should be designed so auth can evolve later to broader user accounts, without overcomplicating MVP now.
