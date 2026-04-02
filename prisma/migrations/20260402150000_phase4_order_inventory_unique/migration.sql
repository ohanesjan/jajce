CREATE UNIQUE INDEX "inventory_transactions_reserved_order_id_unique"
ON "inventory_transactions" ("order_id")
WHERE "type" = 'reserved' AND "order_id" IS NOT NULL;

CREATE UNIQUE INDEX "inventory_transactions_sold_order_id_unique"
ON "inventory_transactions" ("order_id")
WHERE "type" = 'sold' AND "order_id" IS NOT NULL;

CREATE UNIQUE INDEX "inventory_transactions_released_order_id_unique"
ON "inventory_transactions" ("order_id")
WHERE "type" = 'released' AND "order_id" IS NOT NULL;
