"use client";

import { useState } from "react";
import { adminCopy } from "@/lib/admin-localization";

type DailyLogEggFieldValues = {
  eggs_collected_for_sale: string;
  eggs_used_other_purpose: string;
  eggs_broken: string;
  eggs_unusable_other: string;
};

type DailyLogEggFieldsProps = {
  initialValues: {
    eggs_collected_for_sale: number;
    eggs_used_other_purpose: number;
    eggs_broken: number;
    eggs_unusable_other: number;
  };
};

const EDITABLE_INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50";
const READONLY_INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-dashed border-soil/20 bg-[#f9f4ea] px-4 py-3 text-bark/55 outline-none";

export function DailyLogEggFields({ initialValues }: DailyLogEggFieldsProps) {
  const [fieldValues, setFieldValues] = useState<DailyLogEggFieldValues>({
    eggs_collected_for_sale: String(initialValues.eggs_collected_for_sale),
    eggs_used_other_purpose: String(initialValues.eggs_used_other_purpose),
    eggs_broken: String(initialValues.eggs_broken),
    eggs_unusable_other: String(initialValues.eggs_unusable_other),
  });

  const eggsTotalYield = calculateLiveEggsTotalYield(fieldValues);

  return (
    <>
      <NumberField
        label={adminCopy.dailyLogs.eggFields.collectedForSale}
        name="eggs_collected_for_sale"
        value={fieldValues.eggs_collected_for_sale}
        onChange={(value) =>
          setFieldValues((currentValues) => ({
            ...currentValues,
            eggs_collected_for_sale: value,
          }))
        }
      />

      <NumberField
        label={adminCopy.dailyLogs.eggFields.usedOtherPurpose}
        name="eggs_used_other_purpose"
        value={fieldValues.eggs_used_other_purpose}
        onChange={(value) =>
          setFieldValues((currentValues) => ({
            ...currentValues,
            eggs_used_other_purpose: value,
          }))
        }
      />

      <NumberField
        label={adminCopy.dailyLogs.eggFields.broken}
        name="eggs_broken"
        value={fieldValues.eggs_broken}
        onChange={(value) =>
          setFieldValues((currentValues) => ({
            ...currentValues,
            eggs_broken: value,
          }))
        }
      />

      <NumberField
        label={adminCopy.dailyLogs.eggFields.unusableOther}
        name="eggs_unusable_other"
        value={fieldValues.eggs_unusable_other}
        onChange={(value) =>
          setFieldValues((currentValues) => ({
            ...currentValues,
            eggs_unusable_other: value,
          }))
        }
      />

      <label className="block text-sm text-bark">
        <span className="mb-1 block font-medium">
          {adminCopy.dailyLogs.eggFields.autoCalculatedTotalYield}
        </span>
        <input
          type="number"
          name="eggs_total_yield"
          value={String(eggsTotalYield)}
          readOnly
          aria-readonly="true"
          className={READONLY_INPUT_CLASS_NAME}
        />
      </label>
    </>
  );
}

export function calculateLiveEggsTotalYield(values: DailyLogEggFieldValues): number {
  return (
    coerceLiveEggCount(values.eggs_collected_for_sale) +
    coerceLiveEggCount(values.eggs_used_other_purpose) +
    coerceLiveEggCount(values.eggs_broken) +
    coerceLiveEggCount(values.eggs_unusable_other)
  );
}

function coerceLiveEggCount(value: string): number {
  const trimmedValue = value.trim();

  if (/^\d+$/.test(trimmedValue)) {
    return Number.parseInt(trimmedValue, 10);
  }

  return 0;
}

function NumberField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: keyof DailyLogEggFieldValues;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-bark">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        required
        min={0}
        step={1}
        type="number"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={EDITABLE_INPUT_CLASS_NAME}
      />
    </label>
  );
}
