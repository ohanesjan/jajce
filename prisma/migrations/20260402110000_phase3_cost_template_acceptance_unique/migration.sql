CREATE UNIQUE INDEX "cost_entries_template_date_unique"
ON "cost_entries" ("cost_template_id", "date")
WHERE "cost_template_id" IS NOT NULL AND "source_type" = 'template';
