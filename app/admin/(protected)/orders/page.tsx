import type { ReactNode } from "react";
import {
  correctCompletedOrderAction,
  saveOrderAction,
} from "@/app/admin/actions";
import { adminCopy, formatAdminValueLabel } from "@/lib/admin-localization";
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
  ...adminCopy.orders.errors,
};

const ORDER_SUCCESS_MESSAGES: Record<string, string> = {
  ...adminCopy.orders.success,
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
        <p className="eyebrow">{adminCopy.orders.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {editingOrder
            ? isCompletedCorrection
              ? adminCopy.orders.correctCompletedTitle
              : adminCopy.orders.editReservedTitle
            : adminCopy.orders.createTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-bark/75">
          {adminCopy.orders.description}
        </p>

        {successCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {ORDER_SUCCESS_MESSAGES[successCode] ?? adminCopy.common.saveFallback}
          </div>
        ) : null}

        {errorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ORDER_ERROR_MESSAGES[errorCode] ?? adminCopy.common.unknownError}
          </div>
        ) : null}

        {!canCreateOrder && !editingOrder ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            {adminCopy.orders.createContactFirst}
          </div>
        ) : null}

        {isCompletedCorrection ? (
          <form action={correctCompletedOrderAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editingOrder.id} />

            <ReadOnlyField
              label={adminCopy.orders.contact}
              value={editingOrder.contact.full_name}
            />
            <ReadOnlyField
              label={adminCopy.orders.status}
              value={adminCopy.orders.completed}
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {adminCopy.orders.completedCorrectionWarning}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={adminCopy.orders.quantity}>
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

              <FormField label={adminCopy.orders.unitPrice}>
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

            <FormField label={adminCopy.orders.backendComputedTotalPrice}>
              <input
                readOnly
                type="text"
                value={formatDecimalInput(editingOrder.total_price)}
                className="w-full rounded-2xl border border-dashed border-soil/20 bg-[#f9f4ea] px-4 py-3 text-bark/55 outline-none"
              />
            </FormField>

            <FormField label={adminCopy.orders.fulfilledAt}>
              <input
                type="datetime-local"
                name="fulfilled_at"
                defaultValue={formatDateTimeLocalValue(editingOrder.fulfilled_at)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={adminCopy.orders.note}>
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
                {adminCopy.orders.applyCompletedCorrection}
              </button>

              <a
                href="/admin/orders"
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                {adminCopy.common.resetForm}
              </a>
            </div>
          </form>
        ) : (
          <form action={saveOrderAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editingOrder?.id ?? ""} />

            {editingOrder ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {adminCopy.orders.normalEditWarning}
              </div>
            ) : null}

            <FormField label={adminCopy.orders.contact}>
              <select
                required
                disabled={!canCreateOrder}
                name="contact_id"
                defaultValue={editingOrder?.contact_id ?? ""}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50 disabled:cursor-not-allowed disabled:bg-[#f9f4ea]"
              >
                <option value="">{adminCopy.orders.selectContact}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={adminCopy.orders.orderDate}>
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

              <FormField label={adminCopy.orders.targetFulfillmentDate}>
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
              <FormField label={adminCopy.orders.quantity}>
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

              <FormField label={adminCopy.orders.status}>
                <select
                  required
                  name="status"
                  defaultValue={editingOrder?.status ?? "reserved"}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                >
                  <option value="reserved">{formatAdminValueLabel("reserved")}</option>
                  <option value="completed">{formatAdminValueLabel("completed")}</option>
                  {editingOrder ? (
                    <option value="cancelled">{formatAdminValueLabel("cancelled")}</option>
                  ) : null}
                </select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={adminCopy.orders.priceSource}>
                <select
                  required
                  name="price_source"
                  defaultValue={editingOrder?.price_source ?? "default"}
                  className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
                >
                  {PRICE_SOURCE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {formatAdminValueLabel(value)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label={adminCopy.orders.manualUnitPrice}>
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

            <FormField label={adminCopy.orders.backendComputedTotalPrice}>
              <input
                readOnly
                type="text"
                value={editingOrder ? formatDecimalInput(editingOrder.total_price) : ""}
                placeholder={adminCopy.orders.calculatedOnSave}
                className="w-full rounded-2xl border border-dashed border-soil/20 bg-[#f9f4ea] px-4 py-3 text-bark/55 outline-none"
              />
            </FormField>

            <FormField label={adminCopy.orders.fulfilledAt}>
              <input
                type="datetime-local"
                name="fulfilled_at"
                defaultValue={formatDateTimeLocalValue(editingOrder?.fulfilled_at)}
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </FormField>

            <FormField label={adminCopy.orders.note}>
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
                {editingOrder ? adminCopy.orders.update : adminCopy.orders.create}
              </button>

              <a
                href="/admin/orders"
                className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
              >
                {adminCopy.common.resetForm}
              </a>
            </div>
          </form>
        )}
      </section>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-soil/10 px-6 py-5">
          <p className="eyebrow">{adminCopy.orders.recordsEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl text-bark">
            {adminCopy.orders.recordsTitle}
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="px-6 py-8 text-sm text-bark/70">{adminCopy.orders.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/40 text-bark/70">
                <tr>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.date}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.contact}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.status}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.quantity}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.totalPrice}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.fulfilled}</th>
                  <th className="px-6 py-4 font-medium">{adminCopy.orders.actions}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-soil/10">
                    <td className="px-6 py-4">{formatDateOnly(order.date)}</td>
                    <td className="px-6 py-4">{order.contact.full_name}</td>
                    <td className="px-6 py-4">{formatAdminValueLabel(order.status)}</td>
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
                          {adminCopy.orders.edit}
                        </a>
                      ) : order.status === "completed" ? (
                        <a
                          href={`/admin/orders?edit=${encodeURIComponent(order.id)}`}
                          className="rounded-full border border-soil/20 px-3 py-1.5 text-xs text-bark transition hover:border-soil/40"
                        >
                          {adminCopy.orders.correct}
                        </a>
                      ) : (
                        <span className="text-xs text-bark/50">
                          {adminCopy.orders.lockedAfterStockRelease}
                        </span>
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
