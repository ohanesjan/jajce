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
