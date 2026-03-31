export const INVENTORY_TRANSACTION_TYPES = [
  "collected",
  "reserved",
  "released",
  "sold",
  "manual_adjustment",
] as const;

export type InventoryTransactionType =
  (typeof INVENTORY_TRANSACTION_TYPES)[number];

export type InventoryTransactionLike = {
  type: InventoryTransactionType;
  quantity: number;
};

export function assertInventoryTransactionQuantity({
  type,
  quantity,
}: InventoryTransactionLike): void {
  if (type !== "manual_adjustment" && quantity < 0) {
    throw new RangeError(
      `Inventory transaction type "${type}" requires a non-negative quantity.`,
    );
  }
}

export function getInventoryTransactionEffect({
  type,
  quantity,
}: InventoryTransactionLike): number {
  assertInventoryTransactionQuantity({ type, quantity });

  switch (type) {
    case "collected":
    case "released":
      return quantity;
    case "reserved":
    case "sold":
      return -quantity;
    case "manual_adjustment":
      return quantity;
  }
}

export function calculateAvailableInventory(
  transactions: readonly InventoryTransactionLike[],
): number {
  return transactions.reduce(
    (available, transaction) =>
      available + getInventoryTransactionEffect(transaction),
    0,
  );
}
