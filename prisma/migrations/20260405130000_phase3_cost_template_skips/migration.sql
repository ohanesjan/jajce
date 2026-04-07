CREATE TABLE "cost_template_skips" (
  "id" TEXT NOT NULL,
  "cost_template_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cost_template_skips_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cost_template_skips_cost_template_id_idx"
ON "cost_template_skips" ("cost_template_id");

CREATE INDEX "cost_template_skips_date_idx"
ON "cost_template_skips" ("date");

CREATE UNIQUE INDEX "cost_template_skips_cost_template_id_date_key"
ON "cost_template_skips" ("cost_template_id", "date");

ALTER TABLE "cost_template_skips"
ADD CONSTRAINT "cost_template_skips_cost_template_id_fkey"
FOREIGN KEY ("cost_template_id") REFERENCES "cost_templates"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
