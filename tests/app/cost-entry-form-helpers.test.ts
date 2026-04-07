import { describe, expect, it } from "vitest";
import {
  applyCostFieldAutoFill,
  buildCostEntryFormKey,
  buildInitialCostEntryFormState,
  syncRecurringStartDate,
} from "@/app/admin/(protected)/costs/cost-entry-form-helpers";

describe("buildInitialCostEntryFormState", () => {
  it("prefills new cost entries with today and keeps recurring disabled by default", () => {
    const state = buildInitialCostEntryFormState({
      todayDate: "2026-04-09",
      mode: "create",
    });

    expect(state).toMatchObject({
      date: "2026-04-09",
      save_as_recurring: false,
      recurring_start_date: "2026-04-09",
      recurring_end_date: "",
      recurring_is_active: true,
    });
  });

  it("keeps recurring disabled for edit and accept modes", () => {
    expect(
      buildInitialCostEntryFormState({
        todayDate: "2026-04-09",
        mode: "edit",
        initialValues: {
          save_as_recurring: true,
        },
      }).save_as_recurring,
    ).toBe(false);
    expect(
      buildInitialCostEntryFormState({
        todayDate: "2026-04-09",
        mode: "accept",
        initialValues: {
          save_as_recurring: true,
        },
      }).save_as_recurring,
    ).toBe(false);
  });
});

describe("buildCostEntryFormKey", () => {
  it("changes across create, edit, and accept contexts so the client form remounts with fresh state", () => {
    expect(
      buildCostEntryFormKey({
        mode: "create",
        todayDate: "2026-04-09",
      }),
    ).toBe("create:2026-04-09");

    expect(
      buildCostEntryFormKey({
        mode: "edit",
        todayDate: "2026-04-09",
        editId: "cost_entry_1",
      }),
    ).toBe("edit:cost_entry_1");

    expect(
      buildCostEntryFormKey({
        mode: "accept",
        todayDate: "2026-04-09",
        acceptTemplateId: "template_1",
        acceptDate: "2026-04-16",
      }),
    ).toBe("accept:template_1:2026-04-16");
  });

  it("changes when the edited record or accepted occurrence changes", () => {
    expect(
      buildCostEntryFormKey({
        mode: "edit",
        todayDate: "2026-04-09",
        editId: "cost_entry_1",
      }),
    ).not.toBe(
      buildCostEntryFormKey({
        mode: "edit",
        todayDate: "2026-04-09",
        editId: "cost_entry_2",
      }),
    );

    expect(
      buildCostEntryFormKey({
        mode: "accept",
        todayDate: "2026-04-09",
        acceptTemplateId: "template_1",
        acceptDate: "2026-04-09",
      }),
    ).not.toBe(
      buildCostEntryFormKey({
        mode: "accept",
        todayDate: "2026-04-09",
        acceptTemplateId: "template_1",
        acceptDate: "2026-04-16",
      }),
    );
  });
});

describe("applyCostFieldAutoFill", () => {
  it("fills total amount from quantity and unit price", () => {
    expect(
      applyCostFieldAutoFill(
        {
          quantity: "10",
          unit_price: "1.50",
          total_amount: "",
        },
        "unit_price",
      ),
    ).toMatchObject({
      total_amount: "15.00",
    });
  });

  it("fills unit price from quantity and total amount", () => {
    expect(
      applyCostFieldAutoFill(
        {
          quantity: "8",
          unit_price: "",
          total_amount: "20.00",
        },
        "total_amount",
      ),
    ).toMatchObject({
      unit_price: "2.50",
    });
  });

  it("does not overwrite sibling fields when quantity is blank", () => {
    expect(
      applyCostFieldAutoFill(
        {
          quantity: "",
          unit_price: "1.50",
          total_amount: "20.00",
        },
        "quantity",
      ),
    ).toEqual({
      quantity: "",
      unit_price: "1.50",
      total_amount: "20.00",
    });
  });
});

describe("syncRecurringStartDate", () => {
  it("keeps recurring start date aligned with the cost date until manually touched", () => {
    expect(
      syncRecurringStartDate(
        {
          date: "2026-04-09",
          recurring_start_date: "2026-04-09",
          recurring_start_date_touched: false,
        },
        "2026-04-10",
      ),
    ).toBe("2026-04-10");
  });

  it("preserves a manually edited recurring start date", () => {
    expect(
      syncRecurringStartDate(
        {
          date: "2026-04-09",
          recurring_start_date: "2026-04-15",
          recurring_start_date_touched: true,
        },
        "2026-04-10",
      ),
    ).toBe("2026-04-15");
  });
});
