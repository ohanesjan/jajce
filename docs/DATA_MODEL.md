# Jajce Admin/Dashboard MVP — Data Model

## Overview
This schema is designed for:
- correct inventory tracking of sellable eggs
- detailed margin/cost analysis already in MVP
- future extension to recurring customer preferences
- future extension to phone channels and customer profiles

## 1. admins
Purpose: admin authentication for MVP.

Fields:
- `id`
- `email`
- `password_hash`
- `is_active`
- `last_login_at` nullable
- `created_at`
- `updated_at`

Notes:
- MVP auth is local email/password.
- Design it so it can evolve later.

## 2. contacts
Purpose: unified person/contact record for subscribers, waiting list, active customers, and future segmentation.

Fields:
- `id`
- `full_name`
- `email` nullable
- `phone` nullable
- `is_subscriber`
- `is_waiting_list`
- `is_active_customer`
- `email_opt_in`
- `phone_opt_in`
- `preferred_channel` nullable
- `preferred_quantity` nullable
- `preference_unit` nullable
- `notification_frequency` nullable
- `customer_stage`
- `source` nullable
- `joined_waiting_list_at` nullable
- `became_customer_at` nullable
- `notes` nullable
- `created_at`
- `updated_at`

Enums:
- `customer_stage`: `lead`, `subscriber`, `waiting_list`, `active`, `inactive`
- `preferred_channel`: `email`, `viber`, `whatsapp`, `all`
- `preference_unit`: `week`, `month`
- `notification_frequency`: `instant`, `weekly`, `manual_only`

Notes:
- A contact can overlap across roles using flags.
- `customer_stage` is the main lifecycle label.
- Future preference fields should exist now, even if not used on public UI yet.

## 3. daily_logs
Purpose: one daily operational production record.

Fields:
- `id`
- `date` unique
- `eggs_total_yield`
- `eggs_collected_for_sale`
- `eggs_used_other_purpose`
- `eggs_broken`
- `eggs_unusable_other`
- `chicken_count`
- `public_note` nullable
- `notes` nullable
- `created_at`
- `updated_at`

Important rule:
- `eggs_total_yield = eggs_collected_for_sale + eggs_used_other_purpose + eggs_broken + eggs_unusable_other`

Notes:
- In MVP UX, `eggs_total_yield` should be auto-calculated and read-only.
- `eggs_collected_for_sale` is the commercial stock input.

## 4. cost_templates
Purpose: recurring cost suggestion definitions, not actual booked costs.

Fields:
- `id`
- `name`
- `category`
- `cost_type`
- `default_quantity` nullable
- `default_unit` nullable
- `default_unit_price` nullable
- `default_total_amount`
- `frequency`
- `start_date`
- `end_date` nullable
- `is_active`
- `note` nullable
- `created_at`
- `updated_at`

Enums:
- `category`:
  - `feed`
  - `supplements`
  - `bedding_hygiene`
  - `packaging`
  - `transport`
  - `labor_time`
  - `utilities`
  - `maintenance`
  - `veterinary_medicine`
  - `equipment_tools`
  - `land_facility`
  - `miscellaneous`
- `cost_type`: `direct`, `allocated`
- `frequency`: `daily`, `weekly`, `monthly`

Polish-state note:
- recurring-template creation is now primarily driven from the costs flow
- the separate cost-templates page remains a secondary maintenance route

## 4A. cost_template_skips
Purpose: persisted per-occurrence skips for recurring cost suggestions.

Fields:
- `id`
- `cost_template_id`
- `date`
- `created_at`

Notes:
- this table records “skip only this occurrence”
- skipping an occurrence does not disable or delete the template
- keep one row max per `(cost_template_id, date)`

## 5. cost_entries
Purpose: actual accepted/booked costs for a specific day.

Fields:
- `id`
- `date`
- `category`
- `cost_type`
- `quantity` nullable
- `unit` nullable
- `unit_price` nullable
- `total_amount`
- `source_type`
- `cost_template_id` nullable
- `note` nullable
- `created_at`
- `updated_at`

Enums:
- same `category` enum as `cost_templates`
- `cost_type`: `direct`, `allocated`
- `source_type`: `manual`, `template`

Notes:
- `total_amount` is always the accounting truth.
- Keep `source_type`.
- `cost_template_id` links accepted recurring suggestions to their template.
- Later enhancement: pending suggestions until explicitly accepted/rejected.

## 6. orders
Purpose: reservations and completed sales.

Fields:
- `id`
- `contact_id`
- `date`
- `target_fulfillment_date` nullable
- `quantity`
- `unit_price`
- `total_price`
- `status`
- `fulfilled_at` nullable
- `price_source`
- `note` nullable
- `created_at`
- `updated_at`

Enums:
- `status`: `reserved`, `completed`, `cancelled`
- `price_source`: `default`, `manual_override`

Notes:
- `date` = order creation date
- `target_fulfillment_date` = requested date for future booking support
- `fulfilled_at` = actual completion timestamp
- Admin should be able to create:
  - reserved orders
  - direct completed orders

## 7. inventory_transactions
Purpose: ledger of stock changes for sellable eggs only.

Fields:
- `id`
- `date` timestamp
- `type`
- `quantity`
- `daily_log_id` nullable
- `order_id` nullable
- `note` nullable
- `created_at`

Enums:
- `type`: `collected`, `reserved`, `released`, `sold`, `manual_adjustment`

Notes:
- This table is the source of truth for available sellable stock.
- Only stock changes belong here.
- Do not store informational non-stock order lifecycle events here.

## 8. notification_campaigns
Purpose: campaign/message history.

Fields:
- `id`
- `title`
- `channel`
- `audience_type`
- `sender_label`
- `subject` nullable
- `body`
- `status`
- `sent_at` nullable
- `created_at`
- `updated_at`

Enums:
- `channel`: `email`, `viber`, `whatsapp`
- `audience_type`: `subscribers`, `waiting_list`, `active_customers`, `selected_contacts`
- `status`: `draft`, `sent`, `failed`

Notes:
- Real sending in MVP is email only.
- Schema must remain ready for viber/whatsapp soon after MVP.

## 9. notification_recipients
Purpose: per-recipient delivery history.

Fields:
- `id`
- `campaign_id`
- `contact_id`
- `channel`
- `destination`
- `delivery_status`
- `sent_at` nullable
- `provider_message_id` nullable
- `error_message` nullable
- `created_at`

Enums:
- `channel`: `email`, `viber`, `whatsapp`
- `delivery_status`: `pending`, `sent`, `failed`

Notes:
- Preserve the actual destination used.
- Preserve provider message ID for later integrations.


## 10. notification_campaign_selected_contacts
Purpose: persisted selected-contact membership for `selected_contacts` draft campaigns.

Fields:
- `campaign_id`
- `contact_id`
- `created_at`

Notes:
- this join table persists explicit selected contact membership while a campaign is still a draft
- selected contacts are re-resolved against current contact data at send time
- keep one row max per `(campaign_id, contact_id)`

## 11. site_settings
Purpose: small global config values.

Fields:
- `key`
- `value_json`
- `updated_at`

Required MVP keys:
- `default_egg_unit_price`
- `low_stock_threshold`
- `sender_label_default`
- `homepage_availability_mode`
- `homepage_public_note_enabled`

Notes:
- `homepage_availability_mode` currently exists in schema/settings but is not part of the active homepage decision flow
- current homepage availability behavior is threshold-based from source-of-truth services

## Relationships
- `orders.contact_id -> contacts.id`
- `inventory_transactions.daily_log_id -> daily_logs.id`
- `inventory_transactions.order_id -> orders.id`
- `cost_entries.cost_template_id -> cost_templates.id`
- `cost_template_skips.cost_template_id -> cost_templates.id`
- `notification_recipients.campaign_id -> notification_campaigns.id`
- `notification_recipients.contact_id -> contacts.id`

- `notification_campaign_selected_contacts.campaign_id -> notification_campaigns.id`
- `notification_campaign_selected_contacts.contact_id -> contacts.id`
