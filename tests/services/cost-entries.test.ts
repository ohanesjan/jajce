import { Prisma, cost_category, cost_frequency, cost_type } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CostEntryNotFoundError,
  CostTemplateSuggestionNotFoundError,
  DuplicateAcceptedCostTemplateEntryError,
  TemplateCostEntryMutationNotAllowedError,
  acceptRecurringCostSuggestion,
  createCostEntry,
  updateCostEntry,
  validateCostEntryInput,
} from "@/lib/services/cost-entries";
import { CostValidationError } from "@/lib/services/cost-validation";
import { formatDateOnly } from "@/lib/utils/date";

describe("validateCostEntryInput", () => {
  it("defaults manual entries and keeps total_amount as the truth field", () => {
    const validated = validateCostEntryInput({
      date: "2026-04-09",
      category: "feed",
      cost_type: "direct",
      quantity: "10",
      unit: " kg ",
      unit_price: "1.50",
      total_amount: "18.00",
      note: "  Actual invoice total  ",
    });

    expect(validated).toMatchObject({
      category: cost_category.feed,
      cost_type: cost_type.direct,
      quantity: new Prisma.Decimal("10"),
      unit: "kg",
      unit_price: new Prisma.Decimal("1.50"),
      total_amount: new Prisma.Decimal("18.00"),
      source_type: "manual",
      cost_template_id: null,
      note: "Actual invoice total",
    });
    expect(formatDateOnly(validated.date)).toBe("2026-04-09");
  });

  it("rejects a manual entry with a template id", () => {
    expect(() =>
      validateCostEntryInput({
        date: "2026-04-09",
        category: "feed",
        cost_type: "direct",
        total_amount: "18.00",
        source_type: "manual",
        cost_template_id: "template_1",
      }),
    ).toThrow(TemplateCostEntryMutationNotAllowedError);
  });

  it("rejects forged template-origin data in the normal validation path", () => {
    expect(() =>
      validateCostEntryInput({
        date: "2026-04-09",
        category: "feed",
        cost_type: "direct",
        total_amount: "18.00",
        source_type: "template",
        cost_template_id: "template_1",
      }),
    ).toThrow(TemplateCostEntryMutationNotAllowedError);
  });
});

describe("acceptRecurringCostSuggestion", () => {
  it("accepts a matching recurring suggestion into a booked cost entry", async () => {
    const database = createCostEntryTestDatabase();

    const entry = await acceptRecurringCostSuggestion(
      "template_weekly",
      "2026-04-09",
      database as never,
    );

    expect(entry).toMatchObject({
      source_type: "template",
      cost_template_id: "template_weekly",
      category: cost_category.feed,
      cost_type: cost_type.direct,
      total_amount: new Prisma.Decimal("28.00"),
    });
    expect(formatDateOnly(entry.date)).toBe("2026-04-09");
  });

  it("rejects dates with no active matching suggestion", async () => {
    const database = createCostEntryTestDatabase();

    await expect(
      acceptRecurringCostSuggestion("template_weekly", "2026-04-10", database as never),
    ).rejects.toBeInstanceOf(CostTemplateSuggestionNotFoundError);
  });

  it("rejects duplicate accepts before insert when the suggestion is already booked", async () => {
    const database = createCostEntryTestDatabase();

    await expect(
      acceptRecurringCostSuggestion("template_weekly", "2026-04-16", database as never),
    ).rejects.toBeInstanceOf(DuplicateAcceptedCostTemplateEntryError);
  });

  it("maps database uniqueness violations to a duplicate acceptance error", async () => {
    const database = createCostEntryTestDatabase({
      forceDuplicateOnCreate: true,
    });

    await expect(
      acceptRecurringCostSuggestion("template_weekly", "2026-04-09", database as never),
    ).rejects.toBeInstanceOf(DuplicateAcceptedCostTemplateEntryError);
  });
});

describe("create and update cost entries", () => {
  it("creates a manual cost entry", async () => {
    const database = createCostEntryTestDatabase();

    const entry = await createCostEntry(
      {
        date: "2026-04-12",
        category: "utilities",
        cost_type: "allocated",
        total_amount: "14.50",
      },
      database as never,
    );

    expect(entry).toMatchObject({
      category: cost_category.utilities,
      cost_type: cost_type.allocated,
      source_type: "manual",
      total_amount: new Prisma.Decimal("14.50"),
    });
  });

  it("creates a manual cost entry when source_type is omitted from a normal form payload", async () => {
    const database = createCostEntryTestDatabase();

    const entry = await createCostEntry(
      {
        date: "2026-04-12",
        category: "utilities",
        cost_type: "allocated",
        total_amount: "14.50",
        source_type: null,
      },
      database as never,
    );

    expect(entry).toMatchObject({
      category: cost_category.utilities,
      cost_type: cost_type.allocated,
      source_type: "manual",
      total_amount: new Prisma.Decimal("14.50"),
    });
  });

  it("rejects forged template-origin creates in the normal flow", async () => {
    const database = createCostEntryTestDatabase();

    await expect(
      createCostEntry(
        {
          date: "2026-04-12",
          category: "utilities",
          cost_type: "allocated",
          total_amount: "14.50",
          source_type: "template",
          cost_template_id: "template_weekly",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(TemplateCostEntryMutationNotAllowedError);
  });

  it("throws when updating a missing cost entry", async () => {
    const database = createCostEntryTestDatabase();

    await expect(
      updateCostEntry(
        "missing",
        {
          date: "2026-04-12",
          category: "utilities",
          cost_type: "allocated",
          total_amount: "14.50",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(CostEntryNotFoundError);
  });

  it("rejects tampering that tries to convert a manual entry into a template-origin entry", async () => {
    const database = createCostEntryTestDatabase();

    await expect(
      updateCostEntry(
        "existing_manual_entry",
        {
          date: "2026-04-12",
          category: "utilities",
          cost_type: "allocated",
          total_amount: "14.50",
          source_type: "template",
          cost_template_id: "template_weekly",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(TemplateCostEntryMutationNotAllowedError);
  });

  it("rejects normal updates for existing template-origin entries", async () => {
    const database = createCostEntryTestDatabase();

    await expect(
      updateCostEntry(
        "existing_template_accept",
        {
          date: "2026-04-16",
          category: "feed",
          cost_type: "direct",
          total_amount: "30.00",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(TemplateCostEntryMutationNotAllowedError);
  });
});

function createCostEntryTestDatabase(options?: { forceDuplicateOnCreate?: boolean }) {
  const templates: Array<{
    id: string;
    name: string;
    category: cost_category;
    cost_type: cost_type;
    default_quantity: Prisma.Decimal | null;
    default_unit: string | null;
    default_unit_price: Prisma.Decimal | null;
    default_total_amount: Prisma.Decimal;
    frequency: cost_frequency;
    start_date: Date;
    end_date: Date | null;
    is_active: boolean;
    note: string | null;
    created_at: Date;
    updated_at: Date;
  }> = [
    {
      id: "template_weekly",
      name: "Weekly feed",
      category: cost_category.feed,
      cost_type: cost_type.direct,
      default_quantity: new Prisma.Decimal("20.00"),
      default_unit: "kg",
      default_unit_price: new Prisma.Decimal("1.40"),
      default_total_amount: new Prisma.Decimal("28.00"),
      frequency: cost_frequency.weekly,
      start_date: new Date("2026-04-02T00:00:00.000Z"),
      end_date: null,
      is_active: true,
      note: "Supplier A",
      created_at: new Date("2026-04-01T08:00:00.000Z"),
      updated_at: new Date("2026-04-01T08:00:00.000Z"),
    },
  ];

  const costEntries: Array<{
    id: string;
    date: Date;
    category: cost_category;
    cost_type: cost_type;
    quantity: Prisma.Decimal | null;
    unit: string | null;
    unit_price: Prisma.Decimal | null;
    total_amount: Prisma.Decimal;
    source_type: "manual" | "template";
    cost_template_id: string | null;
    note: string | null;
    created_at: Date;
    updated_at: Date;
  }> = [
    {
      id: "existing_manual_entry",
      date: new Date("2026-04-12T00:00:00.000Z"),
      category: cost_category.utilities,
      cost_type: cost_type.allocated,
      quantity: null,
      unit: null,
      unit_price: null,
      total_amount: new Prisma.Decimal("14.50"),
      source_type: "manual",
      cost_template_id: null,
      note: null,
      created_at: new Date("2026-04-12T09:00:00.000Z"),
      updated_at: new Date("2026-04-12T09:00:00.000Z"),
    },
    {
      id: "existing_template_accept",
      date: new Date("2026-04-16T00:00:00.000Z"),
      category: cost_category.feed,
      cost_type: cost_type.direct,
      quantity: new Prisma.Decimal("20.00"),
      unit: "kg",
      unit_price: new Prisma.Decimal("1.40"),
      total_amount: new Prisma.Decimal("28.00"),
      source_type: "template",
      cost_template_id: "template_weekly",
      note: "Supplier A",
      created_at: new Date("2026-04-16T09:00:00.000Z"),
      updated_at: new Date("2026-04-16T09:00:00.000Z"),
    },
  ];
  let sequence = 0;

  const tx = {
    costTemplate: {
      findMany: async ({
        where,
      }: {
        where?: {
          is_active?: boolean;
          start_date?: { lte: Date };
          OR?: Array<{ end_date: null | { gte: Date } }>;
        };
      }) =>
        templates.filter((template) => {
          if (where?.is_active !== undefined && template.is_active !== where.is_active) {
            return false;
          }

          if (where?.start_date?.lte && template.start_date > where.start_date.lte) {
            return false;
          }

          if (where?.OR) {
            return where.OR.some((condition) => {
              if (condition.end_date === null) {
                return template.end_date === null;
              }

              const endDateCondition = condition.end_date as { gte: Date };

              return (
                template.end_date !== null &&
                template.end_date >= endDateCondition.gte
              );
            });
          }

          return true;
        }),
    },
    costEntry: {
      findMany: async ({
        where,
      }: {
        where?: {
          date?: Date;
          source_type?: "template";
          cost_template_id?: { in: string[] };
        };
      }) =>
        costEntries.filter((entry) => {
          if (where?.date && entry.date.getTime() !== where.date.getTime()) {
            return false;
          }

          if (where?.source_type && entry.source_type !== where.source_type) {
            return false;
          }

          if (
            where?.cost_template_id?.in &&
            !where.cost_template_id.in.includes(entry.cost_template_id ?? "")
          ) {
            return false;
          }

          return true;
        }),
      create: async ({
        data,
      }: {
        data: {
          date: Date;
          category: cost_category;
          cost_type: cost_type;
          quantity: Prisma.Decimal | null;
          unit: string | null;
          unit_price: Prisma.Decimal | null;
          total_amount: Prisma.Decimal;
          source_type: "manual" | "template";
          cost_template_id: string | null;
          note: string | null;
        };
      }) => {
        if (
          options?.forceDuplicateOnCreate &&
          data.source_type === "template" &&
          data.cost_template_id === "template_weekly" &&
          formatDateOnly(data.date) === "2026-04-09"
        ) {
          throw { code: "P2002" };
        }

        const duplicate = costEntries.find(
          (entry) =>
            entry.source_type === "template" &&
            entry.cost_template_id !== null &&
            entry.cost_template_id === data.cost_template_id &&
            entry.date.getTime() === data.date.getTime(),
        );

        if (duplicate) {
          throw { code: "P2002" };
        }

        const created = {
          id: `cost_entry_${++sequence}`,
          created_at: new Date("2026-04-01T10:00:00.000Z"),
          updated_at: new Date("2026-04-01T10:00:00.000Z"),
          ...data,
        };

        costEntries.push(created);

        return created;
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: { id: true; source_type?: true };
      }) => {
        const entry = costEntries.find((item) => item.id === where.id) ?? null;

        if (!entry || !select) {
          return entry;
        }

        return {
          id: entry.id,
          ...(select.source_type ? { source_type: entry.source_type } : {}),
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<(typeof costEntries)[number]>;
      }) => {
        const index = costEntries.findIndex((entry) => entry.id === where.id);

        if (index < 0) {
          throw new Error("Missing entry");
        }

        costEntries[index] = {
          ...costEntries[index],
          ...data,
          updated_at: new Date("2026-04-01T11:00:00.000Z"),
        };

        return costEntries[index];
      },
      delete: async () => undefined,
    },
  };

  return {
    ...tx,
    async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
      return callback(tx);
    },
  };
}
