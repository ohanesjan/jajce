import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const schemaPath = path.join(projectRoot, "prisma/schema.prisma");
const migrationPath = path.join(
  projectRoot,
  "prisma/migrations/20260401120000_init/migration.sql",
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
