"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  applyCostFieldAutoFill,
  buildInitialCostEntryFormState,
  syncRecurringStartDate,
  type CostEntryFormMode,
  type CostEntryFormState,
} from "@/app/admin/(protected)/costs/cost-entry-form-helpers";

type CostEntryFormCopy = {
  date: string;
  totalAmount: string;
  category: string;
  costType: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  saveAsRecurring: string;
  recurringHelp: string;
  templateName: string;
  frequency: string;
  templateIsActive: string;
  startDate: string;
  endDate: string;
  note: string;
};

type CostEntryFormOption<Value extends string> = {
  value: Value;
  label: string;
};

type CostEntryFormProps = {
  copy: CostEntryFormCopy;
  categoryOptions: CostEntryFormOption<string>[];
  costTypeOptions: CostEntryFormOption<string>[];
  frequencyOptions: CostEntryFormOption<string>[];
  mode: CostEntryFormMode;
  todayDate: string;
  initialValues?: Partial<Omit<CostEntryFormState, "recurring_start_date_touched">>;
};

const EDITABLE_INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50";
const READONLY_INPUT_CLASS_NAME =
  "admin-readonly-field w-full outline-none";

export function CostEntryForm({
  copy,
  categoryOptions,
  costTypeOptions,
  frequencyOptions,
  mode,
  todayDate,
  initialValues,
}: CostEntryFormProps) {
  const [formValues, setFormValues] = useState(() =>
    buildInitialCostEntryFormState({
      todayDate,
      mode,
      initialValues,
    }),
  );
  const canSaveAsRecurring = mode === "create";
  const isAcceptMode = mode === "accept";

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={copy.date}>
          <input
            required
            type="date"
            name="date"
            value={formValues.date}
            readOnly={isAcceptMode}
            aria-readonly={isAcceptMode ? "true" : undefined}
            onChange={(event) =>
              setFormValues((currentValues) => {
                const nextDate = event.target.value;

                return {
                  ...currentValues,
                  date: nextDate,
                  recurring_start_date: syncRecurringStartDate(
                    currentValues,
                    nextDate,
                  ),
                };
              })
            }
            className={isAcceptMode ? READONLY_INPUT_CLASS_NAME : EDITABLE_INPUT_CLASS_NAME}
          />
        </FormField>

        <FormField label={copy.totalAmount}>
          <input
            required
            min={0}
            step="0.01"
            type="number"
            name="total_amount"
            value={formValues.total_amount}
            onChange={(event) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                ...applyCostFieldAutoFill(
                  {
                    quantity: currentValues.quantity,
                    unit_price: currentValues.unit_price,
                    total_amount: event.target.value,
                  },
                  "total_amount",
                ),
              }))
            }
            className={EDITABLE_INPUT_CLASS_NAME}
          />
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={copy.category}>
          <select
            required
            name="category"
            value={formValues.category}
            onChange={(event) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                category: event.target.value,
              }))
            }
            className={EDITABLE_INPUT_CLASS_NAME}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={copy.costType}>
          <select
            required
            name="cost_type"
            value={formValues.cost_type}
            onChange={(event) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                cost_type: event.target.value,
              }))
            }
            className={EDITABLE_INPUT_CLASS_NAME}
          >
            {costTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label={copy.quantity}>
          <input
            min={0}
            step="0.01"
            type="number"
            name="quantity"
            value={formValues.quantity}
            onChange={(event) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                ...applyCostFieldAutoFill(
                  {
                    quantity: event.target.value,
                    unit_price: currentValues.unit_price,
                    total_amount: currentValues.total_amount,
                  },
                  "quantity",
                ),
              }))
            }
            className={EDITABLE_INPUT_CLASS_NAME}
          />
        </FormField>

        <FormField label={copy.unit}>
          <input
            type="text"
            name="unit"
            value={formValues.unit}
            onChange={(event) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                unit: event.target.value,
              }))
            }
            className={EDITABLE_INPUT_CLASS_NAME}
          />
        </FormField>

        <FormField label={copy.unitPrice}>
          <input
            min={0}
            step="0.01"
            type="number"
            name="unit_price"
            value={formValues.unit_price}
            onChange={(event) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                ...applyCostFieldAutoFill(
                  {
                    quantity: currentValues.quantity,
                    unit_price: event.target.value,
                    total_amount: currentValues.total_amount,
                  },
                  "unit_price",
                ),
              }))
            }
            className={EDITABLE_INPUT_CLASS_NAME}
          />
        </FormField>
      </div>

      {canSaveAsRecurring ? (
        <>
          <label className="flex items-center gap-3 rounded-2xl border border-soil/20 bg-white/60 px-4 py-3 text-sm text-bark">
            <input
              type="checkbox"
              name="save_as_recurring"
              checked={formValues.save_as_recurring}
              onChange={(event) =>
                setFormValues((currentValues) => ({
                  ...currentValues,
                  save_as_recurring: event.target.checked,
                  recurring_start_date: event.target.checked
                    ? currentValues.recurring_start_date || currentValues.date
                    : currentValues.recurring_start_date,
                }))
              }
            />
            <span>{copy.saveAsRecurring}</span>
          </label>

          {formValues.save_as_recurring ? (
            <div className="admin-subsection-shell space-y-4 rounded-2xl">
              <p className="admin-helper-text mt-0">{copy.recurringHelp}</p>

              <FormField label={copy.templateName}>
                <input
                  required={formValues.save_as_recurring}
                  type="text"
                  name="template_name"
                  value={formValues.template_name}
                  onChange={(event) =>
                    setFormValues((currentValues) => ({
                      ...currentValues,
                      template_name: event.target.value,
                    }))
                  }
                  className={EDITABLE_INPUT_CLASS_NAME}
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label={copy.frequency}>
                  <select
                    required={formValues.save_as_recurring}
                    name="recurring_frequency"
                    value={formValues.recurring_frequency}
                    onChange={(event) =>
                      setFormValues((currentValues) => ({
                        ...currentValues,
                        recurring_frequency: event.target.value,
                      }))
                    }
                    className={EDITABLE_INPUT_CLASS_NAME}
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <label className="flex items-center gap-3 rounded-2xl border border-soil/20 bg-white/60 px-4 py-3 text-sm text-bark">
                  <input
                    type="checkbox"
                    name="recurring_is_active"
                    checked={formValues.recurring_is_active}
                    onChange={(event) =>
                      setFormValues((currentValues) => ({
                        ...currentValues,
                        recurring_is_active: event.target.checked,
                      }))
                    }
                  />
                  <span>{copy.templateIsActive}</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label={copy.startDate}>
                  <input
                    required={formValues.save_as_recurring}
                    type="date"
                    name="recurring_start_date"
                    value={formValues.recurring_start_date}
                    onChange={(event) =>
                      setFormValues((currentValues) => ({
                        ...currentValues,
                        recurring_start_date: event.target.value,
                        recurring_start_date_touched: true,
                      }))
                    }
                    className={EDITABLE_INPUT_CLASS_NAME}
                  />
                </FormField>

                <FormField label={copy.endDate}>
                  <input
                    type="date"
                    name="recurring_end_date"
                    value={formValues.recurring_end_date}
                    onChange={(event) =>
                      setFormValues((currentValues) => ({
                        ...currentValues,
                        recurring_end_date: event.target.value,
                      }))
                    }
                    className={EDITABLE_INPUT_CLASS_NAME}
                  />
                </FormField>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <FormField label={copy.note}>
        <textarea
          rows={4}
          name="note"
          value={formValues.note}
          onChange={(event) =>
            setFormValues((currentValues) => ({
              ...currentValues,
              note: event.target.value,
            }))
          }
          className={EDITABLE_INPUT_CLASS_NAME}
        />
      </FormField>
    </>
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
      <span className="mb-2 block font-medium">{label}</span>
      {children}
    </label>
  );
}
