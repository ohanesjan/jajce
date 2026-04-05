import { Prisma, order_status, price_source } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listContactsMock = vi.fn();
const listOrdersMock = vi.fn();
const getDefaultEggUnitPriceMock = vi.fn();
const getAdminLanguageMock = vi.fn();

vi.mock("@/lib/services/contacts", () => ({
  listContacts: listContactsMock,
}));

vi.mock("@/lib/services/orders", () => ({
  listOrders: listOrdersMock,
}));

vi.mock("@/lib/services/site-settings", () => ({
  getDefaultEggUnitPrice: getDefaultEggUnitPriceMock,
}));

vi.mock("@/lib/admin-language.server", () => ({
  getAdminLanguage: getAdminLanguageMock,
}));

describe("AdminOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminLanguageMock.mockResolvedValue("mk");
    listContactsMock.mockResolvedValue([
      {
        id: "contact_1",
        full_name: "Ana",
      },
    ]);
    listOrdersMock.mockResolvedValue([]);
    getDefaultEggUnitPriceMock.mockResolvedValue(new Prisma.Decimal("16.00"));
  });

  it("prefills the new-order unit price field from the default site setting", async () => {
    const { default: AdminOrdersPage } = await import(
      "@/app/admin/(protected)/orders/page"
    );

    const markup = renderToStaticMarkup(
      await AdminOrdersPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain('name="unit_price"');
    expect(markup).toContain('value="16"');
  });

  it("keeps the stored unit price when editing an existing order", async () => {
    listOrdersMock.mockResolvedValue([
      {
        id: "order_1",
        contact_id: "contact_1",
        contact: {
          id: "contact_1",
          full_name: "Ana",
          email: null,
          phone: null,
        },
        date: new Date("2026-04-02T00:00:00.000Z"),
        target_fulfillment_date: null,
        quantity: 4,
        unit_price: new Prisma.Decimal("18.50"),
        total_price: new Prisma.Decimal("74.00"),
        status: order_status.completed,
        fulfilled_at: new Date("2026-04-02T10:30:00.000Z"),
        price_source: price_source.manual_override,
        note: null,
        created_at: new Date("2026-04-02T10:00:00.000Z"),
        updated_at: new Date("2026-04-02T10:00:00.000Z"),
      },
    ]);

    const { default: AdminOrdersPage } = await import(
      "@/app/admin/(protected)/orders/page"
    );

    const markup = renderToStaticMarkup(
      await AdminOrdersPage({
        searchParams: Promise.resolve({ edit: "order_1" }),
      }),
    );

    expect(markup).toContain('name="unit_price"');
    expect(markup).toContain('value="18.5"');
  });
});
