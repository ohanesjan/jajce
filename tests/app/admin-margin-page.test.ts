import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getMarginInsightsMock = vi.fn();
const getAdminLanguageMock = vi.fn();

vi.mock("@/lib/services/margin-insights", () => ({
  getMarginInsights: getMarginInsightsMock,
}));

vi.mock("@/lib/admin-language.server", () => ({
  getAdminLanguage: getAdminLanguageMock,
}));

describe("AdminMarginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminLanguageMock.mockResolvedValue("mk");
    getMarginInsightsMock.mockResolvedValue({
      daily: {
        revenue: 120,
        direct_cost: 40,
        allocated_cost: 10,
        total_cost: 50,
        gross_margin: 70,
        direct_margin: 80,
        cost_per_collected_egg: 2.5,
        margin_per_sold_egg: 3.5,
      },
      summary_7d: {
        eggs_total_yield: 210,
        eggs_collected_for_sale: 180,
        eggs_sold: 160,
        revenue: 900,
        direct_cost: 300,
        allocated_cost: 90,
        total_cost: 390,
        gross_margin: 510,
      },
      summary_30d: {
        eggs_total_yield: 900,
        eggs_collected_for_sale: 760,
        eggs_sold: 700,
        revenue: 3600,
        direct_cost: 1200,
        allocated_cost: 300,
        total_cost: 1500,
        gross_margin: 2100,
      },
    });
  });

  it("renders Macedonian margin labels", async () => {
    const { default: AdminMarginPage } = await import(
      "@/app/admin/(protected)/margin/page"
    );

    const markup = renderToStaticMarkup(
      await AdminMarginPage({
        searchParams: Promise.resolve({ date: "2026-04-10" }),
      }),
    );

    expect(markup).toContain("Маржинални увиди");
    expect(markup).toContain("Дневен приход");
    expect(markup).toContain("Трошок по собрано јајце");
    expect(markup).toContain("Преглед за 7 дена");
    expect(markup).toContain("Подвижен период");
  });
});
