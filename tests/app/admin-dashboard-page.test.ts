import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminDashboardDataMock = vi.fn();
const getHomepagePublicNoteEnabledMock = vi.fn();
const getHomepageStatOverridesMock = vi.fn();
const getAdminLanguageMock = vi.fn();

vi.mock("@/lib/services/admin-dashboard", () => ({
  getAdminDashboardData: getAdminDashboardDataMock,
}));

vi.mock("@/app/admin/actions", () => ({
  saveHomepagePublicNoteSettingAction: vi.fn(),
  saveHomepageStatOverridesAction: vi.fn(),
}));

vi.mock("@/lib/services/site-settings", () => ({
  getHomepagePublicNoteEnabled: getHomepagePublicNoteEnabledMock,
  getHomepageStatOverrides: getHomepageStatOverridesMock,
}));

vi.mock("@/lib/admin-language.server", () => ({
  getAdminLanguage: getAdminLanguageMock,
}));

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminLanguageMock.mockResolvedValue("mk");
    getHomepagePublicNoteEnabledMock.mockResolvedValue(true);
    getHomepageStatOverridesMock.mockResolvedValue({
      today_eggs_collected_for_sale: 44,
      yesterday_eggs_collected_for_sale: null,
      latest_chicken_count: 18,
    });
    getAdminDashboardDataMock.mockImplementation(
      async ({ mode }: { mode?: unknown } = {}) => {
        const resolvedMode = mode === "expanded" ? "expanded" : "simple";

        return buildDashboardPayload(resolvedMode);
      },
    );
  });

  it("renders simple mode by default", async () => {
    const { default: AdminDashboardPage } = await import(
      "@/app/admin/(protected)/dashboard/page"
    );

    const markup = renderToStaticMarkup(
      await AdminDashboardPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain("Достапни јајца");
    expect(markup).toContain("Видливост на јавна белешка");
    expect(markup).toContain(
      "Прикажи ја денешната јавна белешка на почетната страница кога постои во дневниот запис. Кога е исклучено, почетната страница се враќа на стандардното однесување.",
    );
    expect(markup).toContain(
      "Кога е исклучено, почетната страница прикажува само живи производствени податоци и порака за достапност.",
    );
    expect(markup).toContain("Зачувај поставка за почетната страница");
    expect(markup).toContain("Денешна бруто маржа");
    expect(markup).toContain("Прикажани бројки на почетната страница");
    expect(markup).toContain(
      "Овие полиња менуваат само што се прикажува јавно на почетната страница за Денес, Вчера и број на кокошки.",
    );
    expect(markup).toContain(
      "Оставете поле празно за да се врати живата изведена вредност.",
    );
    expect(markup).toContain('name="today_eggs_collected_for_sale"');
    expect(markup).toContain('value="44"');
    expect(markup).toContain('name="latest_chicken_count"');
    expect(markup).toContain('value="18"');
    expect(markup).toContain("Зачувај јавен приказ");
    expect(markup).not.toContain("Трошоци по категорија");
  });

  it("renders expanded mode sections when requested", async () => {
    const { default: AdminDashboardPage } = await import(
      "@/app/admin/(protected)/dashboard/page"
    );

    const markup = renderToStaticMarkup(
      await AdminDashboardPage({
        searchParams: Promise.resolve({ mode: "expanded" }),
      }),
    );

    expect(markup).toContain("Денешен директен трошок");
    expect(markup).toContain("Трошоци по категорија");
    expect(markup).toContain("Храна");
  });

  it("falls back to simple mode on an invalid mode param", async () => {
    const { default: AdminDashboardPage } = await import(
      "@/app/admin/(protected)/dashboard/page"
    );

    const markup = renderToStaticMarkup(
      await AdminDashboardPage({
        searchParams: Promise.resolve({ mode: "invalid-mode" }),
      }),
    );

    expect(getAdminDashboardDataMock).toHaveBeenCalledWith({ mode: "invalid-mode" });
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain(">Основен</a>");
    expect(markup).not.toContain("Трошоци по категорија");
  });

  it("renders English copy when the admin language cookie is set to en", async () => {
    getAdminLanguageMock.mockResolvedValueOnce("en");

    const { default: AdminDashboardPage } = await import(
      "@/app/admin/(protected)/dashboard/page"
    );

    const markup = renderToStaticMarkup(
      await AdminDashboardPage({
        searchParams: Promise.resolve({ mode: "expanded" }),
      }),
    );

    expect(markup).toContain("Available eggs");
    expect(markup).toContain("Public note visibility");
    expect(markup).toContain(
      "When disabled, the homepage returns to its default behavior.",
    );
    expect(markup).toContain(
      "When disabled, the homepage shows only live production data and availability.",
    );
    expect(markup).toContain("Save homepage setting");
    expect(markup).toContain("Homepage displayed stats");
    expect(markup).toContain(
      "These fields change only the public homepage display for Today, Yesterday, and chicken count.",
    );
    expect(markup).toContain(
      "Leave a field blank to restore the live derived value.",
    );
    expect(markup).toContain("Save public display");
    expect(markup).toContain("Costs by category");
  });
});

function buildDashboardPayload(mode: "simple" | "expanded") {
  return {
    mode,
    date: new Date("2026-04-10T00:00:00.000Z"),
    simple: {
      available_eggs: 34,
      today_total_yield: 42,
      today_collected_for_sale: 30,
      yesterday_collected_for_sale: 25,
      latest_chicken_count: 16,
      latest_chicken_count_date: new Date("2026-04-10T00:00:00.000Z"),
      today_sold_eggs: 10,
      today_revenue: 40,
      today_total_cost: 26,
      today_gross_margin: 14,
      subscriber_count: 2,
      waiting_list_count: 2,
      active_customer_count: 3,
    },
    expanded:
      mode === "expanded"
        ? {
            total_yield_per_chicken: 2.625,
            sale_yield_per_chicken: 1.875,
            today_direct_cost: 20,
            today_allocated_cost: 6,
            gross_margin_7d: 37,
            gross_margin_30d: 38,
            cost_by_category: [
              {
                category: "feed",
                total_amount: 18,
              },
            ],
          }
        : null,
  };
}
