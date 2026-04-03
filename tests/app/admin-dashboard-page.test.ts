import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminDashboardDataMock = vi.fn();

vi.mock("@/lib/services/admin-dashboard", () => ({
  getAdminDashboardData: getAdminDashboardDataMock,
}));

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(markup).toContain("Available eggs");
    expect(markup).toContain("Today gross margin");
    expect(markup).not.toContain("Cost by category");
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

    expect(markup).toContain("Today direct cost");
    expect(markup).toContain("Cost by category");
    expect(markup).toContain("Feed");
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
    expect(markup).toContain(">Simple</a>");
    expect(markup).not.toContain("Cost by category");
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
