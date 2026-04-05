import { Prisma, order_status, price_source } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CompletedOrderCorrectionNotAllowedError,
  OrderInventoryInsufficientError,
  OrderInventoryStateError,
  OrderTransitionNotAllowedError,
  correctCompletedOrder,
  createOrder,
  updateEditableOrder,
} from "@/lib/services/orders";

describe("order workflows", () => {
  it("creates a reserved order, uses default unit price, and reduces stock once", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 20 })],
    });

    const order = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "6",
        status: "reserved",
        price_source: "default",
        unit_price: "999.00",
        note: "Reserve for Friday",
      },
      database as never,
      new Date("2026-04-02T09:00:00.000Z"),
    );

    expect(order.status).toBe(order_status.reserved);
    expect(order.unit_price).toEqual(new Prisma.Decimal("16"));
    expect(order.total_price).toEqual(new Prisma.Decimal("96"));
    expect(database.inventoryLockCallCount).toBe(1);
    expect(database.inventoryTransactions.filter((row) => row.order_id === order.id)).toEqual([
      expect.objectContaining({
        type: "reserved",
        quantity: 6,
      }),
    ]);
  });

  it("creates a direct completed order and reduces stock once with a sold row", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 20 })],
    });

    const order = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "4",
        status: "completed",
        price_source: "manual_override",
        unit_price: "18.50",
      },
      database as never,
      new Date("2026-04-02T11:30:00.000Z"),
    );

    expect(order.status).toBe(order_status.completed);
    expect(order.fulfilled_at).toEqual(new Date("2026-04-02T11:30:00.000Z"));
    expect(order.total_price).toEqual(new Prisma.Decimal("74"));
    expect(database.inventoryTransactions.filter((row) => row.order_id === order.id)).toEqual([
      expect.objectContaining({
        type: "sold",
        quantity: 4,
      }),
    ]);
  });

  it("fails reservation when inventory would go below zero", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 3 })],
    });

    await expect(
      createOrder(
        {
          contact_id: "contact_1",
          date: "2026-04-02",
          quantity: "4",
          status: "reserved",
          price_source: "default",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(OrderInventoryInsufficientError);
  });

  it("transitions reserved to completed without a second stock reduction", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 20 })],
    });
    const reserved = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "5",
        status: "reserved",
        price_source: "default",
      },
      database as never,
      new Date("2026-04-02T09:00:00.000Z"),
    );

    await updateEditableOrder(
      reserved.id,
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "5",
        status: "completed",
        price_source: "default",
      },
      database as never,
      new Date("2026-04-03T08:15:00.000Z"),
    );

    const orderRows = database.inventoryTransactions.filter(
      (row) => row.order_id === reserved.id,
    );

    expect(orderRows).toHaveLength(1);
    expect(orderRows[0]).toMatchObject({
      type: "reserved",
      quantity: 5,
    });
  });

  it("transitions reserved to cancelled and creates a released row", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 20 })],
    });
    const reserved = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "7",
        status: "reserved",
        price_source: "default",
      },
      database as never,
      new Date("2026-04-02T09:00:00.000Z"),
    );

    const updated = await updateEditableOrder(
      reserved.id,
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "7",
        status: "cancelled",
        price_source: "default",
        note: "Customer cancelled",
      },
      database as never,
      new Date("2026-04-03T08:15:00.000Z"),
    );

    expect(updated.status).toBe(order_status.cancelled);
    expect(
      database.inventoryTransactions.filter((row) => row.order_id === reserved.id),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "reserved", quantity: 7 }),
        expect.objectContaining({ type: "released", quantity: 7 }),
      ]),
    );
  });

  it("uses a dedicated completed correction path and updates the sold row quantity", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 20 })],
    });
    const completed = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "4",
        status: "completed",
        price_source: "manual_override",
        unit_price: "18.00",
      },
      database as never,
      new Date("2026-04-02T10:00:00.000Z"),
    );

    const corrected = await correctCompletedOrder(
      completed.id,
      {
        quantity: "6",
        unit_price: "17.50",
        fulfilled_at: "2026-04-03T09:30",
        note: "Corrected pack count",
      },
      database as never,
      new Date("2026-04-03T09:30:00.000Z"),
    );

    expect(corrected.quantity).toBe(6);
    expect(corrected.unit_price).toEqual(new Prisma.Decimal("17.50"));
    expect(corrected.total_price).toEqual(new Prisma.Decimal("105"));
    expect(corrected.price_source).toBe(price_source.manual_override);
    expect(database.inventoryLockCallCount).toBe(2);
    expect(
      database.inventoryTransactions.find(
        (row) => row.order_id === completed.id && row.type === "sold",
      ),
    ).toMatchObject({
      quantity: 6,
    });
  });

  it("corrects completed reserved orders by reconciling the reserved row only", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 20 })],
    });
    const reserved = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "5",
        status: "reserved",
        price_source: "default",
      },
      database as never,
      new Date("2026-04-02T08:00:00.000Z"),
    );

    await updateEditableOrder(
      reserved.id,
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "5",
        status: "completed",
        price_source: "default",
      },
      database as never,
      new Date("2026-04-02T12:00:00.000Z"),
    );

    await correctCompletedOrder(
      reserved.id,
      {
        quantity: "6",
        unit_price: "16.00",
      },
      database as never,
      new Date("2026-04-03T08:00:00.000Z"),
    );

    const orderRows = database.inventoryTransactions.filter(
      (row) => row.order_id === reserved.id,
    );

    expect(orderRows).toHaveLength(1);
    expect(orderRows[0]).toMatchObject({
      type: "reserved",
      quantity: 6,
    });
  });

  it("rejects stock-increasing completed corrections when inventory would go below zero", async () => {
    const database = createOrderTestDatabase({
      inventoryTransactions: [
        buildInventoryTransaction({ id: "collected_1", type: "collected", quantity: 8 }),
      ],
    });
    const completed = await createOrder(
      {
        contact_id: "contact_1",
        date: "2026-04-02",
        quantity: "7",
        status: "completed",
        price_source: "default",
      },
      database as never,
      new Date("2026-04-02T10:00:00.000Z"),
    );

    await expect(
      correctCompletedOrder(
        completed.id,
        {
          quantity: "9",
          unit_price: "16.00",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(OrderInventoryInsufficientError);
  });

  it("rejects normal updates for completed orders", async () => {
    const database = createOrderTestDatabase({
      orders: [
        buildOrder({
          id: "completed_1",
          status: order_status.completed,
          quantity: 4,
          unit_price: new Prisma.Decimal("16.00"),
          total_price: new Prisma.Decimal("64.00"),
        }),
      ],
    });

    await expect(
      updateEditableOrder(
        "completed_1",
        {
          contact_id: "contact_1",
          date: "2026-04-02",
          quantity: "4",
          status: "completed",
          price_source: "default",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(CompletedOrderCorrectionNotAllowedError);
  });

  it("rejects completed correction on non-completed orders", async () => {
    const database = createOrderTestDatabase({
      orders: [
        buildOrder({
          id: "reserved_1",
          status: order_status.reserved,
          quantity: 3,
          unit_price: new Prisma.Decimal("16.00"),
          total_price: new Prisma.Decimal("48.00"),
        }),
      ],
    });

    await expect(
      correctCompletedOrder(
        "reserved_1",
        {
          quantity: "4",
          unit_price: "16.00",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(CompletedOrderCorrectionNotAllowedError);
  });

  it("rejects invalid reserved-order updates outside the reserved lifecycle", async () => {
    const database = createOrderTestDatabase({
      orders: [
        buildOrder({
          id: "cancelled_1",
          status: order_status.cancelled,
          quantity: 3,
          unit_price: new Prisma.Decimal("16.00"),
          total_price: new Prisma.Decimal("48.00"),
        }),
      ],
    });

    await expect(
      updateEditableOrder(
        "cancelled_1",
        {
          contact_id: "contact_1",
          date: "2026-04-02",
          quantity: "3",
          status: "cancelled",
          price_source: "default",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(OrderTransitionNotAllowedError);
  });

  it("blocks normal reserved-order updates when the linked inventory rows are already inconsistent", async () => {
    const database = createOrderTestDatabase({
      orders: [
        buildOrder({
          id: "reserved_invalid",
          status: order_status.reserved,
          quantity: 3,
          unit_price: new Prisma.Decimal("16.00"),
          total_price: new Prisma.Decimal("48.00"),
        }),
      ],
      inventoryTransactions: [
        buildInventoryTransaction({
          id: "sold_invalid",
          order_id: "reserved_invalid",
          type: "sold",
          quantity: 3,
        }),
      ],
    });

    await expect(
      updateEditableOrder(
        "reserved_invalid",
        {
          contact_id: "contact_1",
          date: "2026-04-02",
          quantity: "3",
          status: "reserved",
          price_source: "default",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(OrderInventoryStateError);
  });

  it("fails completed correction when duplicate order-linked rows already exist", async () => {
    const database = createOrderTestDatabase({
      orders: [
        buildOrder({
          id: "completed_dup",
          status: order_status.completed,
          quantity: 3,
          unit_price: new Prisma.Decimal("16.00"),
          total_price: new Prisma.Decimal("48.00"),
        }),
      ],
      inventoryTransactions: [
        buildInventoryTransaction({
          id: "sold_1",
          order_id: "completed_dup",
          type: "sold",
          quantity: 3,
        }),
        buildInventoryTransaction({
          id: "sold_2",
          order_id: "completed_dup",
          type: "sold",
          quantity: 3,
        }),
      ],
    });

    await expect(
      correctCompletedOrder(
        "completed_dup",
        {
          quantity: "3",
          unit_price: "16.00",
        },
        database as never,
      ),
    ).rejects.toBeInstanceOf(OrderInventoryStateError);
  });
});

function createOrderTestDatabase(options?: {
  defaultEggUnitPrice?: number | string;
  contacts?: ReturnType<typeof buildContact>[];
  orders?: ReturnType<typeof buildOrder>[];
  inventoryTransactions?: ReturnType<typeof buildInventoryTransaction>[];
}) {
  const contacts = [
    buildContact({ id: "contact_1", full_name: "Ana Trajkovska" }),
    ...(options?.contacts ?? []),
  ];
  const orders = [...(options?.orders ?? [])];
  const inventoryTransactions = [...(options?.inventoryTransactions ?? [])];
  let orderSequence = orders.length;
  let inventorySequence = inventoryTransactions.length;
  let inventoryLockCallCount = 0;

  const tx = {
    $queryRaw: async () => {
      inventoryLockCallCount += 1;
      return [];
    },
    contact: {
      findUnique: async ({
        where,
      }: {
        where: { id: string };
        select?: { id: true };
      }) => contacts.find((contact) => contact.id === where.id) ?? null,
    },
    siteSetting: {
      findUnique: async () => ({
        value_json: options?.defaultEggUnitPrice ?? 16,
      }),
    },
    order: {
      findUnique: async ({
        where,
      }: {
        where: { id: string };
      }) => orders.find((order) => order.id === where.id) ?? null,
      create: async ({ data }: { data: Omit<ReturnType<typeof buildOrder>, "id" | "created_at" | "updated_at"> }) => {
        orderSequence += 1;
        const order = buildOrder({
          id: `order_${orderSequence}`,
          ...data,
          created_at: new Date("2026-04-02T08:00:00.000Z"),
          updated_at: new Date("2026-04-02T08:00:00.000Z"),
        });
        orders.push(order);
        return order;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<ReturnType<typeof buildOrder>>;
      }) => {
        const index = orders.findIndex((order) => order.id === where.id);

        if (index === -1) {
          throw new Error("Missing order");
        }

        const updated = {
          ...orders[index],
          ...data,
          updated_at: new Date("2026-04-03T10:00:00.000Z"),
        };
        orders[index] = updated;
        return updated;
      },
      findMany: async () =>
        orders.map((order) => ({
          ...order,
          contact: contacts.find((contact) => contact.id === order.contact_id)!,
        })),
    },
    inventoryTransaction: {
      findMany: async ({
        where,
        select,
      }: {
        where?: { order_id?: string };
        select?: {
          order_id?: true;
          type?: true;
          quantity?: true;
        };
        orderBy?: Array<Record<string, "asc" | "desc">>;
      } = {}) => {
        const rows = inventoryTransactions.filter((row) =>
          where?.order_id === undefined ? true : row.order_id === where.order_id,
        );

        if (!select) {
          return rows;
        }

        return rows.map((row) => ({
          ...(select.order_id ? { order_id: row.order_id } : {}),
          ...(select.type ? { type: row.type } : {}),
          ...(select.quantity ? { quantity: row.quantity } : {}),
        }));
      },
      create: async ({ data }: { data: Omit<ReturnType<typeof buildInventoryTransaction>, "id" | "created_at"> }) => {
        inventorySequence += 1;
        const duplicate = inventoryTransactions.find(
          (row) => row.order_id === data.order_id && row.type === data.type,
        );

        if (duplicate) {
          const error = new Error("Duplicate inventory row") as Error & {
            code?: string;
          };
          error.code = "P2002";
          throw error;
        }

        const row = buildInventoryTransaction({
          id: `inventory_${inventorySequence}`,
          ...data,
          created_at: new Date("2026-04-02T08:00:00.000Z"),
        });
        inventoryTransactions.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<ReturnType<typeof buildInventoryTransaction>>;
      }) => {
        const index = inventoryTransactions.findIndex((row) => row.id === where.id);

        if (index === -1) {
          throw new Error("Missing inventory row");
        }

        const updated = {
          ...inventoryTransactions[index],
          ...data,
        };
        inventoryTransactions[index] = updated;
        return updated;
      },
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        for (const id of where.id.in) {
          const index = inventoryTransactions.findIndex((row) => row.id === id);

          if (index !== -1) {
            inventoryTransactions.splice(index, 1);
          }
        }
      },
    },
  };

  return {
    contacts,
    orders,
    inventoryTransactions,
    get inventoryLockCallCount() {
      return inventoryLockCallCount;
    },
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
      callback(tx),
    ...tx,
  };
}

function buildContact(
  overrides?: Partial<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  }>,
) {
  return {
    id: overrides?.id ?? "contact_seed",
    full_name: overrides?.full_name ?? "Seed Contact",
    email: overrides?.email ?? null,
    phone: overrides?.phone ?? null,
  };
}

function buildOrder(
  overrides?: Partial<{
    id: string;
    contact_id: string;
    date: Date;
    target_fulfillment_date: Date | null;
    quantity: number;
    unit_price: Prisma.Decimal;
    total_price: Prisma.Decimal;
    status: order_status;
    fulfilled_at: Date | null;
    price_source: price_source;
    note: string | null;
    created_at: Date;
    updated_at: Date;
  }>,
) {
  return {
    id: overrides?.id ?? "order_seed",
    contact_id: overrides?.contact_id ?? "contact_1",
    date: overrides?.date ?? new Date("2026-04-02T00:00:00.000Z"),
    target_fulfillment_date: overrides?.target_fulfillment_date ?? null,
    quantity: overrides?.quantity ?? 1,
    unit_price: overrides?.unit_price ?? new Prisma.Decimal("16.00"),
    total_price: overrides?.total_price ?? new Prisma.Decimal("16.00"),
    status: overrides?.status ?? order_status.reserved,
    fulfilled_at: overrides?.fulfilled_at ?? null,
    price_source: overrides?.price_source ?? price_source.default,
    note: overrides?.note ?? null,
    created_at: overrides?.created_at ?? new Date("2026-04-02T08:00:00.000Z"),
    updated_at: overrides?.updated_at ?? new Date("2026-04-02T08:00:00.000Z"),
  };
}

function buildInventoryTransaction(
  overrides?: Partial<{
    id: string;
    date: Date;
    type: "collected" | "reserved" | "released" | "sold" | "manual_adjustment";
    quantity: number;
    daily_log_id: string | null;
    order_id: string | null;
    note: string | null;
    created_at: Date;
  }>,
) {
  return {
    id: overrides?.id ?? "inventory_seed",
    date: overrides?.date ?? new Date("2026-04-02T08:00:00.000Z"),
    type: overrides?.type ?? "collected",
    quantity: overrides?.quantity ?? 10,
    daily_log_id: overrides?.daily_log_id ?? null,
    order_id: overrides?.order_id ?? null,
    note: overrides?.note ?? null,
    created_at: overrides?.created_at ?? new Date("2026-04-02T08:00:00.000Z"),
  };
}
