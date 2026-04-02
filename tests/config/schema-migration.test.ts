import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const schemaPath = path.join(projectRoot, "prisma/schema.prisma");
const migrationPath = path.join(
  projectRoot,
  "prisma/migrations/20260401120000_init/migration.sql",
);
const phaseTwoInventoryMigrationPath = path.join(
  projectRoot,
  "prisma/migrations/20260401153000_phase2_collected_unique/migration.sql",
);
const phaseThreeCostTemplateAcceptanceMigrationPath = path.join(
  projectRoot,
  "prisma/migrations/20260402110000_phase3_cost_template_acceptance_unique/migration.sql",
);
const phaseFourOrderInventoryGuardMigrationPath = path.join(
  projectRoot,
  "prisma/migrations/20260402150000_phase4_order_inventory_unique/migration.sql",
);

describe("Phase 1 schema and migration safeguards", () => {
  it("does not keep a global uniqueness constraint on inventory_transactions.daily_log_id", () => {
    const schema = readFileSync(schemaPath, "utf8");
    const migration = readFileSync(migrationPath, "utf8");

    expect(schema).not.toMatch(/daily_log_id\s+String\?\s+@unique/);
    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX "inventory_transactions_daily_log_id_key"',
    );
    expect(migration).toContain(
      'CREATE INDEX "inventory_transactions_daily_log_id_idx"',
    );
  });

  it("adds a partial unique index so each daily log has at most one collected row", () => {
    const migration = readFileSync(phaseTwoInventoryMigrationPath, "utf8");

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "inventory_transactions_collected_daily_log_id_unique"',
    );
    expect(migration).toContain(
      `WHERE "type" = 'collected' AND "daily_log_id" IS NOT NULL;`,
    );
  });

  it("adds a partial unique index so a template can only be accepted once per day", () => {
    const migration = readFileSync(
      phaseThreeCostTemplateAcceptanceMigrationPath,
      "utf8",
    );

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "cost_entries_template_date_unique"',
    );
    expect(migration).toContain(
      `ON "cost_entries" ("cost_template_id", "date")`,
    );
    expect(migration).toContain(
      `WHERE "cost_template_id" IS NOT NULL AND "source_type" = 'template';`,
    );
  });

  it("adds partial unique indexes so each order can have at most one reserved, sold, and released row", () => {
    const migration = readFileSync(phaseFourOrderInventoryGuardMigrationPath, "utf8");

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "inventory_transactions_reserved_order_id_unique"',
    );
    expect(migration).toContain(
      `WHERE "type" = 'reserved' AND "order_id" IS NOT NULL;`,
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "inventory_transactions_sold_order_id_unique"',
    );
    expect(migration).toContain(
      `WHERE "type" = 'sold' AND "order_id" IS NOT NULL;`,
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "inventory_transactions_released_order_id_unique"',
    );
    expect(migration).toContain(
      `WHERE "type" = 'released' AND "order_id" IS NOT NULL;`,
    );
  });

  it("includes non-negative and formula check constraints for the core operational tables", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      'CONSTRAINT "daily_logs_eggs_total_yield_non_negative_check"',
    );
    expect(migration).toContain(
      'CONSTRAINT "daily_logs_eggs_total_yield_formula_check"',
    );
    expect(migration).toContain(
      'CONSTRAINT "cost_entries_total_amount_non_negative_check"',
    );
    expect(migration).toContain(
      'CONSTRAINT "orders_total_price_non_negative_check"',
    );
    expect(migration).toContain(
      'CONSTRAINT "inventory_transactions_quantity_by_type_check"',
    );
  });
});
