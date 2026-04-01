"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  authenticateAdminCredentials,
  normalizeAdminEmail,
} from "@/lib/services/admin-auth";
import {
  beginAdminSession,
  clearAdminSession,
  requireAdminSession,
} from "@/lib/services/admin-session";
import {
  createDailyLog,
  DailyLogDateConflictError,
  deleteDailyLog,
  DailyLogNotFoundError,
  DailyLogValidationError,
  updateDailyLog,
} from "@/lib/services/daily-logs";
import {
  CostTemplateInUseError,
  CostTemplateNotFoundError,
  createCostTemplate,
  deleteCostTemplate,
  updateCostTemplate,
} from "@/lib/services/cost-templates";
import {
  CostEntryNotFoundError,
  CostTemplateSuggestionNotFoundError,
  DuplicateAcceptedCostTemplateEntryError,
  TemplateCostEntryMutationNotAllowedError,
  acceptRecurringCostSuggestion,
  createCostEntry,
  deleteCostEntry,
  updateCostEntry,
} from "@/lib/services/cost-entries";
import { CostValidationError as SharedCostValidationError } from "@/lib/services/cost-validation";

export async function loginAdminAction(formData: FormData): Promise<never> {
  const email = normalizeAdminEmail(getStringField(formData, "email"));
  const password = getStringField(formData, "password");
  const nextPath = getSafeNextPath(formData.get("next"));

  if (!email || !password) {
    redirect(`/admin/login?error=${encodeURIComponent("missing_credentials")}`);
  }

  const admin = await authenticateAdminCredentials({
    adminDelegate: getDb().admin,
    email,
    password,
  });

  if (!admin) {
    redirect(`/admin/login?error=${encodeURIComponent("invalid_credentials")}`);
  }

  await beginAdminSession(admin);

  redirect(nextPath ?? "/admin/dashboard");
}

export async function logoutAdminAction(): Promise<never> {
  await clearAdminSession();

  redirect("/admin/login");
}

export async function saveDailyLogAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const dailyLogId = getOptionalStringField(formData, "id");

  try {
    if (dailyLogId) {
      await updateDailyLog(dailyLogId, extractDailyLogFormData(formData));
    } else {
      await createDailyLog(extractDailyLogFormData(formData));
    }

    redirect("/admin/daily-logs?success=saved");
  } catch (error) {
    redirect(
      `/admin/daily-logs?${new URLSearchParams({
        error: getDailyLogErrorCode(error),
        ...(dailyLogId ? { edit: dailyLogId } : {}),
      }).toString()}`,
    );
  }
}

export async function deleteDailyLogAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const dailyLogId = getStringField(formData, "id");

  try {
    await deleteDailyLog(dailyLogId);
    redirect("/admin/daily-logs?success=deleted");
  } catch (error) {
    redirect(
      `/admin/daily-logs?error=${encodeURIComponent(getDailyLogErrorCode(error))}`,
    );
  }
}

export async function saveCostTemplateAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const costTemplateId = getOptionalStringField(formData, "id");

  try {
    if (costTemplateId) {
      await updateCostTemplate(costTemplateId, extractCostTemplateFormData(formData));
    } else {
      await createCostTemplate(extractCostTemplateFormData(formData));
    }

    redirect("/admin/cost-templates?success=saved");
  } catch (error) {
    redirect(
      `/admin/cost-templates?${new URLSearchParams({
        error: getCostTemplateErrorCode(error),
        ...(costTemplateId ? { edit: costTemplateId } : {}),
      }).toString()}`,
    );
  }
}

export async function deleteCostTemplateAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const costTemplateId = getStringField(formData, "id");

  try {
    await deleteCostTemplate(costTemplateId);
    redirect("/admin/cost-templates?success=deleted");
  } catch (error) {
    redirect(
      `/admin/cost-templates?error=${encodeURIComponent(getCostTemplateErrorCode(error))}`,
    );
  }
}

export async function saveCostEntryAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const costEntryId = getOptionalStringField(formData, "id");
  const suggestionDate = getOptionalStringField(formData, "suggestion_date");

  try {
    if (costEntryId) {
      await updateCostEntry(costEntryId, extractCostEntryFormData(formData));
    } else {
      await createCostEntry(extractCostEntryFormData(formData));
    }

    redirect(`/admin/costs?${buildCostsRedirectParams({ success: "saved", suggestionDate })}`);
  } catch (error) {
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        error: getCostEntryErrorCode(error),
        edit: costEntryId,
        suggestionDate,
      })}`,
    );
  }
}

export async function deleteCostEntryAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const costEntryId = getStringField(formData, "id");
  const suggestionDate = getOptionalStringField(formData, "suggestion_date");

  try {
    await deleteCostEntry(costEntryId);
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        success: "deleted",
        suggestionDate,
      })}`,
    );
  } catch (error) {
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        error: getCostEntryErrorCode(error),
        suggestionDate,
      })}`,
    );
  }
}

export async function acceptCostSuggestionAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const costTemplateId = getStringField(formData, "cost_template_id");
  const suggestionDate = getStringField(formData, "date");

  try {
    await acceptRecurringCostSuggestion(costTemplateId, suggestionDate);
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        success: "accepted",
        suggestionDate,
      })}`,
    );
  } catch (error) {
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        error: getCostEntryErrorCode(error),
        suggestionDate,
      })}`,
    );
  }
}

function extractDailyLogFormData(formData: FormData) {
  return {
    date: formData.get("date"),
    eggs_total_yield: formData.get("eggs_total_yield"),
    eggs_collected_for_sale: formData.get("eggs_collected_for_sale"),
    eggs_used_other_purpose: formData.get("eggs_used_other_purpose"),
    eggs_broken: formData.get("eggs_broken"),
    eggs_unusable_other: formData.get("eggs_unusable_other"),
    chicken_count: formData.get("chicken_count"),
    public_note: formData.get("public_note"),
    notes: formData.get("notes"),
  };
}

function extractCostTemplateFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    category: formData.get("category"),
    cost_type: formData.get("cost_type"),
    default_quantity: formData.get("default_quantity"),
    default_unit: formData.get("default_unit"),
    default_unit_price: formData.get("default_unit_price"),
    default_total_amount: formData.get("default_total_amount"),
    frequency: formData.get("frequency"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    is_active: formData.get("is_active"),
    note: formData.get("note"),
  };
}

function extractCostEntryFormData(formData: FormData) {
  return {
    date: formData.get("date"),
    category: formData.get("category"),
    cost_type: formData.get("cost_type"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    unit_price: formData.get("unit_price"),
    total_amount: formData.get("total_amount"),
    source_type: formData.get("source_type"),
    cost_template_id: formData.get("cost_template_id"),
    note: formData.get("note"),
  };
}

function getStringField(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalStringField(
  formData: FormData,
  fieldName: string,
): string | null {
  const value = getStringField(formData, fieldName);

  return value.length > 0 ? value : null;
}

function getDailyLogErrorCode(error: unknown): string {
  if (error instanceof DailyLogValidationError) {
    return "validation";
  }

  if (error instanceof DailyLogDateConflictError) {
    return "duplicate_date";
  }

  if (error instanceof DailyLogNotFoundError) {
    return "not_found";
  }

  return "unknown";
}

function getCostTemplateErrorCode(error: unknown): string {
  if (error instanceof SharedCostValidationError) {
    return "validation";
  }

  if (error instanceof CostTemplateNotFoundError) {
    return "not_found";
  }

  if (error instanceof CostTemplateInUseError) {
    return "in_use";
  }

  return "unknown";
}

function getCostEntryErrorCode(error: unknown): string {
  if (error instanceof SharedCostValidationError) {
    return "validation";
  }

  if (error instanceof CostEntryNotFoundError) {
    return "not_found";
  }

  if (error instanceof CostTemplateSuggestionNotFoundError) {
    return "suggestion_unavailable";
  }

  if (error instanceof DuplicateAcceptedCostTemplateEntryError) {
    return "duplicate_template_date";
  }

  if (error instanceof TemplateCostEntryMutationNotAllowedError) {
    return "template_origin_locked";
  }

  return "unknown";
}

function buildCostsRedirectParams({
  success,
  error,
  edit,
  suggestionDate,
}: {
  success?: string;
  error?: string;
  edit?: string | null;
  suggestionDate?: string | null;
}): string {
  return new URLSearchParams({
    ...(success ? { success } : {}),
    ...(error ? { error } : {}),
    ...(edit ? { edit } : {}),
    ...(suggestionDate ? { suggestionDate } : {}),
  }).toString();
}

function getSafeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue.startsWith("/admin/")) {
    return null;
  }

  return normalizedValue;
}
