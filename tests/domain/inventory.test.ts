import { describe, expect, it } from "vitest";
import {
  assertInventoryTransactionQuantity,
  calculateAvailableInventory,
  getInventoryTransactionEffect,
} from "@/lib/domain/inventory";

describe("assertInventoryTransactionQuantity", () => {
  it("rejects negative quantities for non-manual transaction types", () => {
    expect(() =>
      assertInventoryTransactionQuantity({
        type: "reserved",
        quantity: -2,
      }),
    ).toThrow(/non-negative quantity/i);
  });

  it("allows signed manual adjustments", () => {
    expect(() =>
      assertInventoryTransactionQuantity({
        type: "manual_adjustment",
        quantity: -2,
      }),
    ).not.toThrow();
  });
});

describe("getInventoryTransactionEffect", () => {
  it("maps business transaction types to signed stock effects", () => {
    expect(getInventoryTransactionEffect({ type: "collected", quantity: 12 })).toBe(
      12,
    );
    expect(getInventoryTransactionEffect({ type: "reserved", quantity: 5 })).toBe(
      -5,
    );
    expect(getInventoryTransactionEffect({ type: "released", quantity: 5 })).toBe(
      5,
    );
    expect(getInventoryTransactionEffect({ type: "sold", quantity: 4 })).toBe(-4);
    expect(
      getInventoryTransactionEffect({
        type: "manual_adjustment",
        quantity: -2,
      }),
    ).toBe(-2);
  });

  it("throws when a non-manual transaction quantity is negative", () => {
    expect(() =>
      getInventoryTransactionEffect({
        type: "sold",
        quantity: -4,
      }),
    ).toThrow(/non-negative quantity/i);
  });
});

describe("calculateAvailableInventory", () => {
  it("sums signed sellable-stock effects", () => {
    expect(
      calculateAvailableInventory([
        { type: "collected", quantity: 50 },
        { type: "reserved", quantity: 12 },
        { type: "released", quantity: 2 },
        { type: "sold", quantity: 18 },
        { type: "manual_adjustment", quantity: -1 },
      ]),
    ).toBe(21);
  });
});
