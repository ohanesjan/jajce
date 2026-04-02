import type { ReactNode } from "react";
import {
  correctCompletedOrderAction,
  saveOrderAction,
} from "@/app/admin/actions";
import { listContacts } from "@/lib/services/contacts";
import { listOrders } from "@/lib/services/orders";
import { PRICE_SOURCE_VALUES } from "@/lib/services/order-validation";
import { getDefaultEggUnitPrice } from "@/lib/services/site-settings";
import {
  formatDateOnly,
  formatDateTimeLocalInTimeZone,
} from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type OrdersPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  validation: "Please check the order fields and try again.",
  not_found: "The selected order was not found.",
  contact_not_found: "The selected contact was not found.",
  insufficient_inventory:
    "This operation would reduce sellable inventory below zero.",
  transition_not_allowed:
    "That order change is not allowed in the normal order workflow.",
  completed_correction_required:
    "Completed orders must be changed through the dedicated correction flow.",
  invalid_inventory_state:
    "This order has an invalid inventory state and needs manual investigation.",
  unknown: "The order could not be saved.",
};

const ORDER_SUCCESS_MESSAGES: Record<string, string> = {
  saved: "Order saved.",
  corrected: "Completed order corrected.",
};
const ADMIN_ORDER_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

export default async function AdminOrdersPage({
  searchParams,
}: OrdersPageProps) {
  const [contacts, orders, defaultEggUnitPrice, resolvedSearchParams] =
    await Promise.all([
    listContacts(),
    listOrders(),
    getDefaultEggUnitPrice(),
    searchParams ?? Promise.resolve({} as SearchParamsRecord),
  ]);
  const editId = readSearchParam(resolvedSearchParams.edit);
  const editingOrder = editId
    ? orders.find((order) => order.id === editId) ?? null
    : null;
  const successCode = readSearchParam(resolvedSearchParams.success);
  const errorCode = readSearchParam(resolvedSearchParams.error);
  const isCompletedCorrection = editingOrder?.status === "completed";
  const canCreateOrder = contacts.length > 0;

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
      <section className="card-surface p-6">
        <p className="eyebrow">Phase 4</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editingOrder
            ? isCompletedCorrection
              ? "Correct completed order"
              : "Edit reserved order"
            : "Create order"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          Total price is always computed on the backend from quantity and the
          resolved unit price. Completed-order corrections use a dedicated
          service path.
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {ORDER_SUCCESS_MESSAGES[successCode] ?? "Saved."}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ORDER_ERROR_MESSAGES[errorCode] ?? "Something went wrong."}
          </div>
        ) : null}

        {!canCreateOrder && !editingOrder ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            Create a contact first before adding orders.
          </div>
        ) : null}

        {isCompletedCorrection ? (
          <form action={correctCompletedOrderAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editingOrder.id} />

            <ReadOnlyField
              label="Contact"
              value={editingOrder.contact.full_name}
            />
            <ReadOnlyField
              label="Status"
              value="Completed"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Quantity">
                <input
                  required
                  min={1}
                  step={1}
                  type="number"
                  name="quantity"
                  defaultValue={editingOrder.quantity}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>

              <FormField label="Unit price">
                <input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  name="unit_price"
                  defaultValue={formatDecimalInput(editingOrder.unit_price)}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>
            </div>

            <FormField label="Backend-computed total price">
              <input
                readOnly
                type="text"
                value={formatDecimalInput(editingOrder.total_price)}
                className="w-full rounded-2xl border border-dashed border-soil/20 bg-[#f9f4ea] px-4 py-3 text-bark/55 outline-none"
              />
            </FormField>

            <FormField label="Fulfilled at">
              <input
                type="datetime-local"
                name="fulfilled_at"
                defaultValue={formatDateTimeLocalValue(editingOrder.fulfilled_at)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label="Note">
              <textarea
                rows={4}
                name="note"
                defaultValue={editingOrder.note ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
              >
                Apply completed correction
              </button>

              <a
                href="/admin/orders"
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                Reset form
              </a>
            </div>
          </form>
        ) : (
          <form action={saveOrderAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editingOrder?.id ?? ""} />

            <FormField label="Contact">
              <select
                required
                disabled={!canCreateOrder}
                name="contact_id"
                defaultValue={editingOrder?.contact_id ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50 disabled:cursor-not-allowed disabled:bg-[#f9f4ea]"
              >
                <option value="">Select contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Order date">
                <input
                  required
                  type="date"
                  name="date"
                  defaultValue={
                    editingOrder ? formatDateOnly(editingOrder.date) : ""
                  }
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>

              <FormField label="Target fulfillment date">
                <input
                  type="date"
                  name="target_fulfillment_date"
                  defaultValue={
                    editingOrder?.target_fulfillment_date
                      ? formatDateOnly(editingOrder.target_fulfillment_date)
                      : ""
                  }
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Quantity">
                <input
                  required
                  min={1}
                  step={1}
                  type="number"
                  name="quantity"
                  defaultValue={editingOrder?.quantity ?? 1}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>

              <FormField label="Status">
                <select
                  required
                  name="status"
                  defaultValue={editingOrder?.status ?? "reserved"}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                >
                  <option value="reserved">Reserved</option>
                  <option value="completed">Completed</option>
                  {editingOrder ? <option value="cancelled">Cancelled</option> : null}
                </select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Price source">
                <select
                  required
                  name="price_source"
                  defaultValue={editingOrder?.price_source ?? "default"}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                >
                  {PRICE_SOURCE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {formatSelectLabel(value)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Manual unit price">
                <input
                  min={0}
                  step="0.01"
                  type="number"
                  name="unit_price"
                  defaultValue={
                    editingOrder
                      ? formatDecimalInput(editingOrder.unit_price)
                      : formatDecimalInput(defaultEggUnitPrice)
                  }
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                />
              </FormField>
            </div>

            <FormField label="Backend-computed total price">
              <input
                readOnly
                type="text"
                value={editingOrder ? formatDecimalInput(editingOrder.total_price) : ""}
                placeholder="Calculated on save"
                className="w-full rounded-2xl border border-dashed border-soil/20 bg-[#f9f4ea] px-4 py-3 text-bark/55 outline-none"
              />
            </FormField>

            <FormField label="Fulfilled at">
              <input
                type="datetime-local"
                name="fulfilled_at"
                defaultValue={formatDateTimeLocalValue(editingOrder?.fulfilled_at)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label="Note">
              <textarea
                rows={4}
                name="note"
                defaultValue={editingOrder?.note ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canCreateOrder}
                className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90 disabled:cursor-not-allowed disabled:bg-bark/40"
              >
                {editingOrder ? "Update order" : "Create order"}
              </button>

              <a
                href="/admin/orders"
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                Reset form
              </a>
            </div>
          </form>
        )}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">Records</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">Saved orders</h2>
        </div>

        {orders.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Quantity</th>
                  <th className="px-6 py-4 font-medium">Total price</th>
                  <th className="px-6 py-4 font-medium">Fulfilled</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{formatDateOnly(order.date)}</td>
                    <td className="px-6 py-4">{order.contact.full_name}</td>
                    <td className="px-6 py-4">{formatSelectLabel(order.status)}</td>
                    <td className="px-6 py-4">{order.quantity}</td>
                    <td className="px-6 py-4">
                      {formatDecimalInput(order.total_price)}
                    </td>
                    <td className="px-6 py-4">
                      {order.fulfilled_at
                        ? formatDateTimeLocalValue(order.fulfilled_at).replace("T", " ")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === "reserved" ? (
                        <a
                          href={`/admin/orders?edit=${encodeURIComponent(order.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          Edit
                        </a>
                      ) : order.status === "completed" ? (
                        <a
                          href={`/admin/orders?edit=${encodeURIComponent(order.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          Correct
                        </a>
                      ) : (
                        <span className="text-xs text-bark/50">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm text-bark">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm text-bark">
      <span className="mb-1 block font-medium">{label}</span>
      <div className="rounded-2xl border border-dashed border-soil/20 bg-[#f9f4ea] px-4 py-3 text-bark/75">
        {value}
      </div>
    </div>
  );
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function formatSelectLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDecimalInput(
  value: { toString(): string } | number | null | undefined,
): string {
  if (value == null) {
    return "";
  }

  return value.toString();
}

function formatDateTimeLocalValue(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }

  return formatDateTimeLocalInTimeZone(value, ADMIN_ORDER_TIME_ZONE);
}
