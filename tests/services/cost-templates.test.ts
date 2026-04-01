import { Prisma, cost_category, cost_frequency, cost_type } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CostTemplateInUseError,
  CostTemplateNotFoundError,
  deleteCostTemplate,
  doesCostTemplateApplyOnDate,
  listRecurringCostSuggestionsForDate,
  updateCostTemplate,
  validateCostTemplateInput,
} from "@/lib/services/cost-templates";
import { CostValidationError } from "@/lib/services/cost-validation";
import { formatDateOnly } from "@/lib/utils/date";

describe("validateCostTemplateInput", () => {
  it("parses and normalizes valid template input", () => {
    const validated = validateCostTemplateInput({
      name: "  Weekly feed  ",
      category: "feed",
      cost_type: "direct",
      default_quantity: "12.50",
      default_unit: "  kg ",
      default_unit_price: "1.80",
      default_total_amount: "22.50",
      frequency: "weekly",
      start_date: "2026-04-01",
      end_date: "2026-06-01",
      is_active: "on",
      note: "  Supplier A ",
    });

    expect(validated).toMatchObject({
      name: "Weekly feed",
      category: cost_category.feed,
      cost_type: cost_type.direct,
      default_quantity: new Prisma.Decimal("12.50"),
      default_unit: "kg",
      default_unit_price: new Prisma.Decimal("1.80"),
      default_total_amount: new Prisma.Decimal("22.50"),
      frequency: cost_frequency.weekly,
      is_active: true,
      note: "Supplier A",
    });
    expect(formatDateOnly(validated.start_date)).toBe("2026-04-01");
    expect(formatDateOnly(validated.end_date!)).toBe("2026-06-01");
  });

  it("rejects an end date before the start date", () => {
    expect(() =>
      validateCostTemplateInput({
        name: "Monthly utilities",
        category: "utilities",
        cost_type: "allocated",
        default_total_amount: "30",
        frequency: "monthly",
        start_date: "2026-04-10",
        end_date: "2026-04-01",
      }),
    ).toThrow(CostValidationError);
  });
});

describe("doesCostTemplateApplyOnDate", () => {
  it("supports daily recurrence", () => {
    expect(
      doesCostTemplateApplyOnDate(
        {
          frequency: cost_frequency.daily,
          start_date: new Date("2026-04-01T00:00:00.000Z"),
          end_date: null,
          is_active: true,
        },
        new Date("2026-04-05T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("anchors weekly recurrence to the template start date", () => {
    expect(
      doesCostTemplateApplyOnDate(
        {
          frequency: cost_frequency.weekly,
          start_date: new Date("2026-04-02T00:00:00.000Z"),
          end_date: null,
          is_active: true,
        },
        new Date("2026-04-16T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      doesCostTemplateApplyOnDate(
        {
          frequency: cost_frequency.weekly,
          start_date: new Date("2026-04-02T00:00:00.000Z"),
          end_date: null,
          is_active: true,
        },
        new Date("2026-04-15T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("anchors monthly recurrence to the start day-of-month", () => {
    expect(
      doesCostTemplateApplyOnDate(
        {
          frequency: cost_frequency.monthly,
          start_date: new Date("2026-01-31T00:00:00.000Z"),
          end_date: null,
          is_active: true,
        },
        new Date("2026-03-31T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      doesCostTemplateApplyOnDate(
        {
          frequency: cost_frequency.monthly,
          start_date: new Date("2026-01-31T00:00:00.000Z"),
          end_date: null,
          is_active: true,
        },
        new Date("2026-04-30T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("listRecurringCostSuggestionsForDate", () => {
  it("returns matching active templates and marks accepted suggestions", async () => {
    const database = createCostTemplateTestDatabase();

    const suggestions = await listRecurringCostSuggestionsForDate(
      "2026-04-09",
      database as never,
    );

    expect(suggestions.map((suggestion) => suggestion.template.name)).toEqual([
      "Daily bedding",
      "Weekly feed",
    ]);
    expect(suggestions).toMatchObject([
      {
        template: { id: "template_daily" },
        already_accepted: false,
        accepted_cost_entry_id: null,
      },
      {
        template: { id: "template_weekly" },
        already_accepted: true,
        accepted_cost_entry_id: "cost_entry_accepted",
      },
    ]);
  });
});

describe("updateCostTemplate", () => {
  it("throws when updating a missing template", async () => {
    const database = createCostTemplateTestDatabase();

    await expect(
      updateCostTemplate(
        "missing",
        {
          name: "Feed",
          category: "feed",
          cost_type: "direct",
          default_total_amount: "12",
          frequency: "daily",
          start_date: "2026-04-01",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(CostTemplateNotFoundError);
  });
});

describe("deleteCostTemplate", () => {
  it("blocks deleting templates that are already referenced by booked costs", async () => {
    const database = createCostTemplateTestDatabase();

    await expect(
      deleteCostTemplate("template_weekly", database as never),
    ).rejects.toBeInstanceOf(CostTemplateInUseError);
  });
});

function createCostTemplateTestDatabase() {
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
      id: "template_daily",
      name: "Daily bedding",
      category: cost_category.bedding_hygiene,
      cost_type: cost_type.direct,
      default_quantity: null,
      default_unit: null,
      default_unit_price: null,
      default_total_amount: new Prisma.Decimal("5.00"),
      frequency: cost_frequency.daily,
      start_date: new Date("2026-04-01T00:00:00.000Z"),
      end_date: null,
      is_active: true,
      note: null,
      created_at: new Date("2026-04-01T08:00:00.000Z"),
      updated_at: new Date("2026-04-01T08:00:00.000Z"),
    },
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
      created_at: new Date("2026-04-01T09:00:00.000Z"),
      updated_at: new Date("2026-04-01T09:00:00.000Z"),
    },
    {
      id: "template_inactive",
      name: "Inactive utility",
      category: cost_category.utilities,
      cost_type: cost_type.allocated,
      default_quantity: null,
      default_unit: null,
      default_unit_price: null,
      default_total_amount: new Prisma.Decimal("12.00"),
      frequency: cost_frequency.monthly,
      start_date: new Date("2026-04-09T00:00:00.000Z"),
      end_date: null,
      is_active: false,
      note: null,
      created_at: new Date("2026-04-01T10:00:00.000Z"),
      updated_at: new Date("2026-04-01T10:00:00.000Z"),
    },
  ];

  const acceptedEntries = [
    {
      id: "cost_entry_accepted",
      cost_template_id: "template_weekly",
    },
  ];

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
      }) => {
        return templates.filter((template) => {
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
        });
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: { id: true };
      }) => {
        const template = templates.find((item) => item.id === where.id) ?? null;

        if (!template || !select) {
          return template;
        }

        return { id: template.id };
      },
      update: async () => {
        throw new Error("Unexpected update in this test.");
      },
      create: async () => {
        throw new Error("Unexpected create in this test.");
      },
      delete: async () => {
        throw new Error("Unexpected delete in this test.");
      },
    },
    costEntry: {
      findMany: async () => acceptedEntries,
      findFirst: async ({
        where,
      }: {
        where: {
          cost_template_id: string;
        };
      }) =>
        acceptedEntries.find(
          (entry) => entry.cost_template_id === where.cost_template_id,
        ) ?? null,
    },
  };

  return {
    ...tx,
    async $transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
      return callback(tx);
    },
  };
}
