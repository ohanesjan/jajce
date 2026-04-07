WITH ranked_collected_rows AS (
  SELECT
    inventory_transactions.id,
    inventory_transactions.daily_log_id,
    ROW_NUMBER() OVER (
      PARTITION BY inventory_transactions.daily_log_id
      ORDER BY inventory_transactions.created_at ASC, inventory_transactions.id ASC
    ) AS row_number
  FROM "inventory_transactions"
  WHERE inventory_transactions.type = 'collected'
    AND inventory_transactions.daily_log_id IS NOT NULL
),
kept_collected_rows AS (
  SELECT
    ranked_collected_rows.id,
    ranked_collected_rows.daily_log_id
  FROM ranked_collected_rows
  WHERE ranked_collected_rows.row_number = 1
)
UPDATE "inventory_transactions"
SET
  "date" = "daily_logs"."date"::timestamp(3),
  "quantity" = "daily_logs"."eggs_collected_for_sale",
  "note" = 'Daily log collected inventory reconciliation'
FROM kept_collected_rows
JOIN "daily_logs" ON "daily_logs"."id" = kept_collected_rows.daily_log_id
WHERE "inventory_transactions"."id" = kept_collected_rows.id;

WITH ranked_collected_rows AS (
  SELECT
    inventory_transactions.id,
    ROW_NUMBER() OVER (
      PARTITION BY inventory_transactions.daily_log_id
      ORDER BY inventory_transactions.created_at ASC, inventory_transactions.id ASC
    ) AS row_number
  FROM "inventory_transactions"
  WHERE inventory_transactions.type = 'collected'
    AND inventory_transactions.daily_log_id IS NOT NULL
)
DELETE FROM "inventory_transactions"
USING ranked_collected_rows
WHERE "inventory_transactions"."id" = ranked_collected_rows.id
  AND ranked_collected_rows.row_number > 1;

CREATE UNIQUE INDEX "inventory_transactions_collected_daily_log_id_unique"
ON "inventory_transactions" ("daily_log_id")
WHERE "type" = 'collected' AND "daily_log_id" IS NOT NULL;
