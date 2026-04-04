"use server";

import { revalidatePath } from "next/cache";
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
import {
  ContactInUseError,
  ContactNotFoundError,
  createContact,
  deleteContact,
  updateContact,
} from "@/lib/services/contacts";
import { CostValidationError as SharedCostValidationError } from "@/lib/services/cost-validation";
import { ContactValidationError } from "@/lib/services/contact-validation";
import {
  CompletedOrderCorrectionNotAllowedError,
  OrderContactNotFoundError,
  OrderInventoryInsufficientError,
  OrderInventoryStateError,
  OrderNotFoundError,
  OrderTransitionNotAllowedError,
  correctCompletedOrder,
  createOrder,
  updateEditableOrder,
} from "@/lib/services/orders";
import { OrderValidationError } from "@/lib/services/order-validation";
import {
  SiteSettingValidationError,
  getSenderLabelDefault,
  updateHomepagePublicNoteEnabled,
} from "@/lib/services/site-settings";
import {
  NotificationCampaignChannelNotSupportedError,
  NotificationCampaignNoEligibleRecipientsError,
  NotificationCampaignNotFoundError,
  NotificationCampaignReadOnlyError,
  saveNotificationCampaignDraft,
  sendNotificationCampaign,
} from "@/lib/services/notification-campaigns";
import { NotificationCampaignValidationError } from "@/lib/services/notification-validation";

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
  } catch (error) {
    redirect(
      `/admin/daily-logs?${new URLSearchParams({
        error: getDailyLogErrorCode(error),
        ...(dailyLogId ? { edit: dailyLogId } : {}),
      }).toString()}`,
    );
  }

  redirect("/admin/daily-logs?success=saved");
}

export async function deleteDailyLogAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const dailyLogId = getStringField(formData, "id");

  try {
    await deleteDailyLog(dailyLogId);
  } catch (error) {
    redirect(
      `/admin/daily-logs?error=${encodeURIComponent(getDailyLogErrorCode(error))}`,
    );
  }

  redirect("/admin/daily-logs?success=deleted");
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
  } catch (error) {
    redirect(
      `/admin/cost-templates?${new URLSearchParams({
        error: getCostTemplateErrorCode(error),
        ...(costTemplateId ? { edit: costTemplateId } : {}),
      }).toString()}`,
    );
  }

  redirect("/admin/cost-templates?success=saved");
}

export async function deleteCostTemplateAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const costTemplateId = getStringField(formData, "id");

  try {
    await deleteCostTemplate(costTemplateId);
  } catch (error) {
    redirect(
      `/admin/cost-templates?error=${encodeURIComponent(getCostTemplateErrorCode(error))}`,
    );
  }

  redirect("/admin/cost-templates?success=deleted");
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
  } catch (error) {
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        error: getCostEntryErrorCode(error),
        edit: costEntryId,
        suggestionDate,
      })}`,
    );
  }

  redirect(`/admin/costs?${buildCostsRedirectParams({ success: "saved", suggestionDate })}`);
}

export async function deleteCostEntryAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const costEntryId = getStringField(formData, "id");
  const suggestionDate = getOptionalStringField(formData, "suggestion_date");

  try {
    await deleteCostEntry(costEntryId);
  } catch (error) {
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        error: getCostEntryErrorCode(error),
        suggestionDate,
      })}`,
    );
  }

  redirect(
    `/admin/costs?${buildCostsRedirectParams({
      success: "deleted",
      suggestionDate,
    })}`,
  );
}

export async function acceptCostSuggestionAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const costTemplateId = getStringField(formData, "cost_template_id");
  const suggestionDate = getStringField(formData, "date");

  try {
    await acceptRecurringCostSuggestion(costTemplateId, suggestionDate);
  } catch (error) {
    redirect(
      `/admin/costs?${buildCostsRedirectParams({
        error: getCostEntryErrorCode(error),
        suggestionDate,
      })}`,
    );
  }

  redirect(
    `/admin/costs?${buildCostsRedirectParams({
      success: "accepted",
      suggestionDate,
    })}`,
  );
}

export async function saveContactAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const contactId = getOptionalStringField(formData, "id");

  try {
    if (contactId) {
      await updateContact(contactId, extractContactFormData(formData));
    } else {
      await createContact(extractContactFormData(formData));
    }
  } catch (error) {
    redirect(
      `/admin/contacts?${new URLSearchParams({
        error: getContactErrorCode(error),
        ...(contactId ? { edit: contactId } : {}),
      }).toString()}`,
    );
  }

  redirect("/admin/contacts?success=saved");
}

export async function deleteContactAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const contactId = getStringField(formData, "id");

  try {
    await deleteContact(contactId);
  } catch (error) {
    redirect(
      `/admin/contacts?error=${encodeURIComponent(getContactErrorCode(error))}`,
    );
  }

  redirect("/admin/contacts?success=deleted");
}

export async function saveOrderAction(formData: FormData): Promise<never> {
  await requireAdminSession();

  const orderId = getOptionalStringField(formData, "id");

  try {
    if (orderId) {
      await updateEditableOrder(orderId, extractOrderFormData(formData));
    } else {
      await createOrder(extractOrderFormData(formData));
    }
  } catch (error) {
    redirect(
      `/admin/orders?${new URLSearchParams({
        error: getOrderErrorCode(error),
        ...(orderId ? { edit: orderId } : {}),
      }).toString()}`,
    );
  }

  redirect("/admin/orders?success=saved");
}

export async function correctCompletedOrderAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const orderId = getStringField(formData, "id");

  try {
    await correctCompletedOrder(orderId, extractCompletedOrderCorrectionFormData(formData));
  } catch (error) {
    redirect(
      `/admin/orders?${new URLSearchParams({
        error: getOrderErrorCode(error),
        edit: orderId,
      }).toString()}`,
    );
  }

  redirect("/admin/orders?success=corrected");
}

export async function saveHomepagePublicNoteSettingAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const mode = getOptionalStringField(formData, "mode");

  try {
    await updateHomepagePublicNoteEnabled(
      formData.get("homepage_public_note_enabled"),
    );
  } catch (error) {
    redirect(
      `/admin/dashboard?${new URLSearchParams({
        ...(mode ? { mode } : {}),
        settingsError: getSiteSettingErrorCode(error),
      }).toString()}`,
    );
  }

  revalidatePath("/");

  redirect(
    `/admin/dashboard?${new URLSearchParams({
      ...(mode ? { mode } : {}),
      settingsSuccess: "saved",
    }).toString()}`,
  );
}

export async function saveNotificationCampaignAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const campaignId = getOptionalStringField(formData, "id");
  let savedCampaignId: string;

  try {
    const senderLabel =
      getOptionalStringField(formData, "sender_label") ??
      (await getSenderLabelDefault());
    const campaign = await saveNotificationCampaignDraft(
      extractNotificationCampaignFormData(formData, senderLabel),
      {
        campaignId,
      },
    );
    savedCampaignId = campaign.id;
  } catch (error) {
    redirect(
      `/admin/notifications?${new URLSearchParams({
        error: getNotificationCampaignErrorCode(error),
        ...(campaignId ? { edit: campaignId } : {}),
      }).toString()}`,
    );
  }

  redirect(
    `/admin/notifications?${new URLSearchParams({
      success: "saved",
      edit: savedCampaignId,
    }).toString()}`,
  );
}

export async function sendNotificationCampaignAction(
  formData: FormData,
): Promise<never> {
  await requireAdminSession();

  const campaignId = getStringField(formData, "id");
  let sendStatus: string;

  try {
    const result = await sendNotificationCampaign(campaignId);
    sendStatus = result.status === "sent" ? "sent" : "failed";
  } catch (error) {
    redirect(
      `/admin/notifications?${new URLSearchParams({
        error: getNotificationCampaignErrorCode(error),
        edit: campaignId,
      }).toString()}`,
    );
  }

  redirect(
    `/admin/notifications?${new URLSearchParams({
      success: sendStatus,
    }).toString()}`,
  );
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

function extractContactFormData(formData: FormData) {
  return {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    is_subscriber: formData.get("is_subscriber"),
    is_waiting_list: formData.get("is_waiting_list"),
    is_active_customer: formData.get("is_active_customer"),
    email_opt_in: formData.get("email_opt_in"),
    phone_opt_in: formData.get("phone_opt_in"),
    preferred_channel: formData.get("preferred_channel"),
    preferred_quantity: formData.get("preferred_quantity"),
    preference_unit: formData.get("preference_unit"),
    notification_frequency: formData.get("notification_frequency"),
    customer_stage: formData.get("customer_stage"),
    source: formData.get("source"),
    joined_waiting_list_at: formData.get("joined_waiting_list_at"),
    became_customer_at: formData.get("became_customer_at"),
    notes: formData.get("notes"),
  };
}

function extractOrderFormData(formData: FormData) {
  return {
    contact_id: formData.get("contact_id"),
    date: formData.get("date"),
    target_fulfillment_date: formData.get("target_fulfillment_date"),
    quantity: formData.get("quantity"),
    status: formData.get("status"),
    price_source: formData.get("price_source"),
    unit_price: formData.get("unit_price"),
    fulfilled_at: formData.get("fulfilled_at"),
    note: formData.get("note"),
  };
}

function extractCompletedOrderCorrectionFormData(formData: FormData) {
  return {
    quantity: formData.get("quantity"),
    unit_price: formData.get("unit_price"),
    fulfilled_at: formData.get("fulfilled_at"),
    note: formData.get("note"),
  };
}

function extractNotificationCampaignFormData(
  formData: FormData,
  senderLabel?: string,
) {
  return {
    title: formData.get("title"),
    channel: formData.get("channel"),
    audience_type: formData.get("audience_type"),
    sender_label: senderLabel ?? formData.get("sender_label"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    selected_contact_ids: formData.getAll("selected_contact_ids"),
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

function getContactErrorCode(error: unknown): string {
  if (error instanceof ContactValidationError) {
    return "validation";
  }

  if (error instanceof ContactNotFoundError) {
    return "not_found";
  }

  if (error instanceof ContactInUseError) {
    return "in_use";
  }

  return "unknown";
}

function getOrderErrorCode(error: unknown): string {
  if (error instanceof OrderValidationError) {
    return "validation";
  }

  if (error instanceof OrderNotFoundError) {
    return "not_found";
  }

  if (error instanceof OrderContactNotFoundError) {
    return "contact_not_found";
  }

  if (error instanceof OrderInventoryInsufficientError) {
    return "insufficient_inventory";
  }

  if (error instanceof OrderTransitionNotAllowedError) {
    return "transition_not_allowed";
  }

  if (error instanceof CompletedOrderCorrectionNotAllowedError) {
    return "completed_correction_required";
  }

  if (error instanceof OrderInventoryStateError) {
    return "invalid_inventory_state";
  }

  return "unknown";
}

function getSiteSettingErrorCode(error: unknown): string {
  if (error instanceof SiteSettingValidationError) {
    return "validation";
  }

  return "unknown";
}

function getNotificationCampaignErrorCode(error: unknown): string {
  if (error instanceof NotificationCampaignValidationError) {
    return "validation";
  }

  if (error instanceof NotificationCampaignNotFoundError) {
    return "not_found";
  }

  if (error instanceof NotificationCampaignReadOnlyError) {
    return "read_only";
  }

  if (error instanceof NotificationCampaignChannelNotSupportedError) {
    return "unsupported_channel";
  }

  if (error instanceof NotificationCampaignNoEligibleRecipientsError) {
    return "no_eligible_recipients";
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
