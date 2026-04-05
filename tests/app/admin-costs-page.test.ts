import { Prisma, cost_category, cost_type } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listCostEntriesMock = vi.fn();
const listRecurringCostSuggestionsForDateMock = vi.fn();
const listRecurringCostOccurrencesInRangeMock = vi.fn();
const listCostTemplatesMock = vi.fn();
const getAdminLanguageMock = vi.fn();

vi.mock("@/lib/services/cost-entries", () => ({
  listCostEntries: listCostEntriesMock,
}));

vi.mock("@/lib/services/cost-templates", () => ({
  describeTemplateSchedule: vi.fn(() => "weekly from 2026-04-02"),
  listCostTemplates: listCostTemplatesMock,
  listRecurringCostOccurrencesInRange: listRecurringCostOccurrencesInRangeMock,
  listRecurringCostSuggestionsForDate: listRecurringCostSuggestionsForDateMock,
}));

vi.mock("@/app/admin/actions", () => ({
  acceptCostSuggestionAction: vi.fn(),
  deleteCostEntryAction: vi.fn(),
  deleteCostTemplateAction: vi.fn(),
  saveCostEntryAction: vi.fn(),
  skipCostSuggestionAction: vi.fn(),
  toggleCostTemplateActiveAction: vi.fn(),
}));

vi.mock("@/lib/admin-language", () => ({
  getAdminLanguage: getAdminLanguageMock,
}));

describe("AdminCostsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminLanguageMock.mockResolvedValue("mk");
    listCostEntriesMock.mockResolvedValue([
      {
        id: "cost_entry_1",
        date: new Date("2026-04-09T00:00:00.000Z"),
        category: cost_category.feed,
        cost_type: cost_type.direct,
        quantity: new Prisma.Decimal("10"),
        unit: "kg",
        unit_price: new Prisma.Decimal("1.50"),
        total_amount: new Prisma.Decimal("15.00"),
        source_type: "manual",
        cost_template_id: null,
        note: "Feed cost",
        created_at: new Date("2026-04-09T08:00:00.000Z"),
        updated_at: new Date("2026-04-09T08:00:00.000Z"),
        cost_template: null,
      },
    ]);
    listRecurringCostSuggestionsForDateMock.mockResolvedValue([
      {
        template: {
          id: "template_1",
          name: "Weekly feed",
          category: cost_category.feed,
          cost_type: cost_type.direct,
          default_quantity: new Prisma.Decimal("20.00"),
          default_unit: "kg",
          default_unit_price: new Prisma.Decimal("1.40"),
          default_total_amount: new Prisma.Decimal("28.00"),
          frequency: "weekly",
          start_date: new Date("2026-04-02T00:00:00.000Z"),
          end_date: null,
          is_active: true,
          note: "Supplier A",
          created_at: new Date("2026-04-01T08:00:00.000Z"),
          updated_at: new Date("2026-04-01T08:00:00.000Z"),
        },
        date: new Date("2026-04-09T00:00:00.000Z"),
        status: "pending",
        accepted_cost_entry_id: null,
        skipped_occurrence_id: null,
      },
    ]);
    listRecurringCostOccurrencesInRangeMock.mockResolvedValue([
      {
        template: {
          id: "template_1",
          name: "Weekly feed",
          category: cost_category.feed,
          cost_type: cost_type.direct,
          default_total_amount: new Prisma.Decimal("28.00"),
        },
        date: new Date("2026-04-09T00:00:00.000Z"),
        status: "pending",
      },
    ]);
    listCostTemplatesMock.mockResolvedValue([
      {
        id: "template_1",
        name: "Weekly feed",
        category: cost_category.feed,
        cost_type: cost_type.direct,
        default_total_amount: new Prisma.Decimal("28.00"),
        frequency: "weekly",
        start_date: new Date("2026-04-02T00:00:00.000Z"),
        end_date: null,
        is_active: true,
        note: "Supplier A",
        created_at: new Date("2026-04-01T08:00:00.000Z"),
        updated_at: new Date("2026-04-01T08:00:00.000Z"),
        _count: {
          cost_entries: 0,
        },
      },
    ]);
  });

  it("renders the primary costs workflow with recurring creation, suggestions, preview, and lifecycle controls", async () => {
    const { default: AdminCostsPage } = await import(
      "@/app/admin/(protected)/costs/page"
    );

    const markup = renderToStaticMarkup(
      await AdminCostsPage({
        searchParams: Promise.resolve({ suggestionDate: "2026-04-09" }),
      }),
    );

    expect(markup).toContain("Зачувај како шаблон за повторлив трошок");
    expect(markup).toContain("Измени и прифати");
    expect(markup).toContain(">Прескокни<");
    expect(markup).toContain("Следни 7 дена");
    expect(markup).toContain("Следни 30 дена");
    expect(markup).toContain("Отвори одржување");
    expect(markup).toContain("Означи како неактивен");
    expect(markup).toContain("Избриши некористен");
  });

  it("switches the main form into edit-and-accept mode from the selected suggestion", async () => {
    const { default: AdminCostsPage } = await import(
      "@/app/admin/(protected)/costs/page"
    );

    const markup = renderToStaticMarkup(
      await AdminCostsPage({
        searchParams: Promise.resolve({
          suggestionDate: "2026-04-09",
          acceptTemplate: "template_1",
        }),
      }),
    );

    expect(markup).toContain("Измени и прифати повторлив трошок");
    expect(markup).toContain("Зачувај изменето прифаќање");
    expect(markup).toContain('name="accept_cost_template_id"');
  });
});
