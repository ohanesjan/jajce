export type CostEntryFormMode = "create" | "edit" | "accept";

export type CostEntryFormState = {
  date: string;
  category: string;
  cost_type: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_amount: string;
  note: string;
  save_as_recurring: boolean;
  template_name: string;
  recurring_frequency: string;
  recurring_start_date: string;
  recurring_end_date: string;
  recurring_is_active: boolean;
  recurring_start_date_touched: boolean;
};

export function buildInitialCostEntryFormState({
  todayDate,
  mode,
  initialValues,
}: {
  todayDate: string;
  mode: CostEntryFormMode;
  initialValues?: Partial<Omit<CostEntryFormState, "recurring_start_date_touched">>;
}): CostEntryFormState {
  const date = initialValues?.date?.trim() || todayDate;
  const recurringStartDate =
    initialValues?.recurring_start_date?.trim() || date;

  return {
    date,
    category: initialValues?.category?.trim() || "feed",
    cost_type: initialValues?.cost_type?.trim() || "direct",
    quantity: initialValues?.quantity?.trim() || "",
    unit: initialValues?.unit?.trim() || "",
    unit_price: initialValues?.unit_price?.trim() || "",
    total_amount: initialValues?.total_amount?.trim() || "",
    note: initialValues?.note ?? "",
    save_as_recurring:
      mode === "create" ? (initialValues?.save_as_recurring ?? false) : false,
    template_name: initialValues?.template_name?.trim() || "",
    recurring_frequency: initialValues?.recurring_frequency?.trim() || "monthly",
    recurring_start_date: recurringStartDate,
    recurring_end_date: initialValues?.recurring_end_date?.trim() || "",
    recurring_is_active: initialValues?.recurring_is_active ?? true,
    recurring_start_date_touched:
      recurringStartDate !== date && recurringStartDate.length > 0,
  };
}

export function buildCostEntryFormKey({
  mode,
  todayDate,
  editId,
  acceptTemplateId,
  acceptDate,
}: {
  mode: CostEntryFormMode;
  todayDate: string;
  editId?: string | null;
  acceptTemplateId?: string | null;
  acceptDate?: string | null;
}): string {
  if (mode === "edit") {
    return `edit:${editId ?? "missing"}`;
  }

  if (mode === "accept") {
    return `accept:${acceptTemplateId ?? "missing"}:${acceptDate ?? "missing"}`;
  }

  return `create:${todayDate}`;
}

export function applyCostFieldAutoFill(
  values: Pick<CostEntryFormState, "quantity" | "unit_price" | "total_amount">,
  changedField: "quantity" | "unit_price" | "total_amount",
): Pick<CostEntryFormState, "quantity" | "unit_price" | "total_amount"> {
  const quantity = parseNonNegativeDecimal(values.quantity);
  const unitPrice = parseNonNegativeDecimal(values.unit_price);
  const totalAmount = parseNonNegativeDecimal(values.total_amount);

  if (changedField === "unit_price") {
    if (quantity !== null && quantity > 0 && unitPrice !== null) {
      return {
        ...values,
        total_amount: formatCalculatedDecimal(quantity * unitPrice),
      };
    }

    return values;
  }

  if (changedField === "total_amount") {
    if (quantity !== null && quantity > 0 && totalAmount !== null) {
      return {
        ...values,
        unit_price: formatCalculatedDecimal(totalAmount / quantity),
      };
    }

    return values;
  }

  if (quantity !== null && quantity > 0) {
    if (unitPrice !== null) {
      return {
        ...values,
        total_amount: formatCalculatedDecimal(quantity * unitPrice),
      };
    }

    if (totalAmount !== null) {
      return {
        ...values,
        unit_price: formatCalculatedDecimal(totalAmount / quantity),
      };
    }
  }

  return values;
}

export function syncRecurringStartDate(
  currentState: Pick<
    CostEntryFormState,
    "date" | "recurring_start_date" | "recurring_start_date_touched"
  >,
  nextDate: string,
): string {
  if (!currentState.recurring_start_date_touched) {
    return nextDate;
  }

  if (currentState.recurring_start_date === currentState.date) {
    return nextDate;
  }

  return currentState.recurring_start_date;
}

function parseNonNegativeDecimal(value: string): number | null {
  const trimmedValue = value.trim();

  if (!/^\d+(\.\d+)?$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number.parseFloat(trimmedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatCalculatedDecimal(value: number): string {
  return value.toFixed(2);
}
