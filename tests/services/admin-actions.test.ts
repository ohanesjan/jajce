import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CostValidationError } from "@/lib/services/cost-validation";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const revalidatePathMock = vi.fn();
const authenticateAdminCredentialsMock = vi.fn();
const beginAdminSessionMock = vi.fn();
const clearAdminSessionMock = vi.fn();
const requireAdminSessionMock = vi.fn();
const createDailyLogMock = vi.fn();
const updateDailyLogMock = vi.fn();
const deleteDailyLogMock = vi.fn();
const createCostTemplateMock = vi.fn();
const updateCostTemplateMock = vi.fn();
const deleteCostTemplateMock = vi.fn();
const setCostTemplateActiveStateMock = vi.fn();
const createCostEntryMock = vi.fn();
const createCostEntryWithRecurringTemplateMock = vi.fn();
const updateCostEntryMock = vi.fn();
const deleteCostEntryMock = vi.fn();
const acceptRecurringCostSuggestionMock = vi.fn();
const acceptRecurringCostSuggestionWithOverridesMock = vi.fn();
const skipRecurringCostSuggestionMock = vi.fn();
const createContactMock = vi.fn();
const updateContactMock = vi.fn();
const deleteContactMock = vi.fn();
const createOrderMock = vi.fn();
const updateEditableOrderMock = vi.fn();
const correctCompletedOrderMock = vi.fn();
const updateHomepagePublicNoteEnabledMock = vi.fn();
const getSenderLabelDefaultMock = vi.fn();
const saveNotificationCampaignDraftMock = vi.fn();
const sendNotificationCampaignMock = vi.fn();
const setAdminLanguageCookieMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/services/admin-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/admin-auth")>(
    "@/lib/services/admin-auth",
  );

  return {
    ...actual,
    authenticateAdminCredentials: authenticateAdminCredentialsMock,
  };
});

vi.mock("@/lib/services/admin-session", () => ({
  beginAdminSession: beginAdminSessionMock,
  clearAdminSession: clearAdminSessionMock,
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/admin-language", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-language")>(
    "@/lib/admin-language",
  );

  return {
    ...actual,
    setAdminLanguageCookie: setAdminLanguageCookieMock,
  };
});

vi.mock("@/lib/services/daily-logs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/daily-logs")>(
    "@/lib/services/daily-logs",
  );

  return {
    ...actual,
    createDailyLog: createDailyLogMock,
    updateDailyLog: updateDailyLogMock,
    deleteDailyLog: deleteDailyLogMock,
  };
});

vi.mock("@/lib/services/cost-templates", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/cost-templates")>(
    "@/lib/services/cost-templates",
  );

  return {
    ...actual,
    createCostTemplate: createCostTemplateMock,
    updateCostTemplate: updateCostTemplateMock,
    deleteCostTemplate: deleteCostTemplateMock,
    setCostTemplateActiveState: setCostTemplateActiveStateMock,
  };
});

vi.mock("@/lib/services/cost-entries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/cost-entries")>(
    "@/lib/services/cost-entries",
  );

  return {
    ...actual,
    createCostEntry: createCostEntryMock,
    createCostEntryWithRecurringTemplate: createCostEntryWithRecurringTemplateMock,
    updateCostEntry: updateCostEntryMock,
    deleteCostEntry: deleteCostEntryMock,
    acceptRecurringCostSuggestion: acceptRecurringCostSuggestionMock,
    acceptRecurringCostSuggestionWithOverrides:
      acceptRecurringCostSuggestionWithOverridesMock,
    skipRecurringCostSuggestion: skipRecurringCostSuggestionMock,
  };
});

vi.mock("@/lib/services/contacts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/contacts")>(
    "@/lib/services/contacts",
  );

  return {
    ...actual,
    createContact: createContactMock,
    updateContact: updateContactMock,
    deleteContact: deleteContactMock,
  };
});

vi.mock("@/lib/services/orders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/orders")>(
    "@/lib/services/orders",
  );

  return {
    ...actual,
    createOrder: createOrderMock,
    updateEditableOrder: updateEditableOrderMock,
    correctCompletedOrder: correctCompletedOrderMock,
  };
});

vi.mock("@/lib/services/site-settings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/site-settings")>(
    "@/lib/services/site-settings",
  );

  return {
    ...actual,
    getSenderLabelDefault: getSenderLabelDefaultMock,
    updateHomepagePublicNoteEnabled: updateHomepagePublicNoteEnabledMock,
  };
});

vi.mock("@/lib/services/notification-campaigns", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/notification-campaigns")
  >("@/lib/services/notification-campaigns");

  return {
    ...actual,
    saveNotificationCampaignDraft: saveNotificationCampaignDraftMock,
    sendNotificationCampaign: sendNotificationCampaignMock,
  };
});

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    admin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }),
}));

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminSessionMock.mockResolvedValue(undefined);
    getSenderLabelDefaultMock.mockResolvedValue("Jajce");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loginAdminAction", () => {
    it("redirects with an error when credentials are missing", async () => {
      const { loginAdminAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("email", "");
      formData.set("password", "");

      await expect(loginAdminAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/login?error=missing_credentials",
      );
      expect(authenticateAdminCredentialsMock).not.toHaveBeenCalled();
    });

    it("redirects with an invalid-credentials error for a failed login", async () => {
      authenticateAdminCredentialsMock.mockResolvedValueOnce(null);

      const { loginAdminAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("email", "admin@jajce.mk");
      formData.set("password", "wrong-password");

      await expect(loginAdminAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/login?error=invalid_credentials",
      );
      expect(beginAdminSessionMock).not.toHaveBeenCalled();
    });

    it("starts a session and redirects to the requested admin path on successful login", async () => {
      authenticateAdminCredentialsMock.mockResolvedValueOnce({
        id: "admin_1",
        email: "admin@jajce.mk",
        last_login_at: new Date("2026-04-01T08:30:00.000Z"),
      });

      const { loginAdminAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("email", "admin@jajce.mk");
      formData.set("password", "correct-password");
      formData.set("next", "/admin/daily-logs");

      await expect(loginAdminAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/daily-logs",
      );
      expect(beginAdminSessionMock).toHaveBeenCalledWith({
        id: "admin_1",
        email: "admin@jajce.mk",
        last_login_at: new Date("2026-04-01T08:30:00.000Z"),
      });
    });
  });

  describe("setAdminLanguageAction", () => {
    it("stores the selected admin language and redirects back to the same admin url", async () => {
      const { setAdminLanguageAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("language", "en");
      formData.set("next", "/admin/orders?edit=order_1&success=saved");

      await expect(setAdminLanguageAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/orders?edit=order_1&success=saved",
      );
      expect(requireAdminSessionMock).toHaveBeenCalledTimes(1);
      expect(setAdminLanguageCookieMock).toHaveBeenCalledWith("en");
    });
  });

  describe("successful mutation redirects", () => {
    it("saveDailyLogAction redirects to success after creating a daily log", async () => {
      createDailyLogMock.mockResolvedValueOnce({ id: "daily_log_1" });

      const { saveDailyLogAction } = await import("@/app/admin/actions");

      await expect(saveDailyLogAction(buildDailyLogFormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/daily-logs?success=saved",
      );
      expect(createDailyLogMock).toHaveBeenCalledTimes(1);
    });

    it("deleteDailyLogAction redirects to success after deleting a daily log", async () => {
      deleteDailyLogMock.mockResolvedValueOnce(undefined);

      const { deleteDailyLogAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "daily_log_1");

      await expect(deleteDailyLogAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/daily-logs?success=deleted",
      );
      expect(deleteDailyLogMock).toHaveBeenCalledWith("daily_log_1");
    });

    it("saveCostTemplateAction redirects to success after creating a cost template", async () => {
      createCostTemplateMock.mockResolvedValueOnce({ id: "template_1" });

      const { saveCostTemplateAction } = await import("@/app/admin/actions");

      await expect(saveCostTemplateAction(buildCostTemplateFormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/cost-templates?success=saved",
      );
      expect(createCostTemplateMock).toHaveBeenCalledTimes(1);
    });

    it("deleteCostTemplateAction redirects to success after deleting a cost template", async () => {
      deleteCostTemplateMock.mockResolvedValueOnce(undefined);

      const { deleteCostTemplateAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "template_1");

      await expect(deleteCostTemplateAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/cost-templates?success=deleted",
      );
      expect(deleteCostTemplateMock).toHaveBeenCalledWith("template_1");
    });

    it("saveCostEntryAction redirects to success after creating a cost entry", async () => {
      createCostEntryMock.mockResolvedValueOnce({ id: "cost_entry_1" });

      const { saveCostEntryAction } = await import("@/app/admin/actions");

      await expect(saveCostEntryAction(buildCostEntryFormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=saved&suggestionDate=2026-04-09",
      );
      expect(createCostEntryMock).toHaveBeenCalledTimes(1);
    });

    it("saveCostEntryAction redirects to recurring success when saving a cost plus template", async () => {
      createCostEntryWithRecurringTemplateMock.mockResolvedValueOnce({
        cost_entry: { id: "cost_entry_1" },
        cost_template: { id: "template_1" },
      });

      const { saveCostEntryAction } = await import("@/app/admin/actions");

      await expect(
        saveCostEntryAction(buildRecurringCostEntryFormData()),
      ).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=saved_with_recurring&suggestionDate=2026-04-09",
      );
      expect(createCostEntryWithRecurringTemplateMock).toHaveBeenCalledTimes(1);
    });

    it("saveCostEntryAction redirects to accepted when saving an edited recurring suggestion", async () => {
      acceptRecurringCostSuggestionWithOverridesMock.mockResolvedValueOnce({
        id: "cost_entry_1",
      });

      const { saveCostEntryAction } = await import("@/app/admin/actions");
      const formData = buildCostEntryFormData();

      formData.set("accept_cost_template_id", "template_1");

      await expect(saveCostEntryAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=accepted&suggestionDate=2026-04-09",
      );
      expect(acceptRecurringCostSuggestionWithOverridesMock).toHaveBeenCalledWith(
        "template_1",
        expect.objectContaining({
          date: "2026-04-09",
          total_amount: "15.00",
        }),
      );
    });

    it("deleteCostEntryAction redirects to success after deleting a cost entry", async () => {
      deleteCostEntryMock.mockResolvedValueOnce(undefined);

      const { deleteCostEntryAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "cost_entry_1");
      formData.set("suggestion_date", "2026-04-09");

      await expect(deleteCostEntryAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=deleted&suggestionDate=2026-04-09",
      );
      expect(deleteCostEntryMock).toHaveBeenCalledWith("cost_entry_1");
    });

    it("acceptCostSuggestionAction redirects to success after accepting a suggestion", async () => {
      acceptRecurringCostSuggestionMock.mockResolvedValueOnce({ id: "cost_entry_1" });

      const { acceptCostSuggestionAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("cost_template_id", "template_1");
      formData.set("date", "2026-04-09");

      await expect(acceptCostSuggestionAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=accepted&suggestionDate=2026-04-09",
      );
      expect(acceptRecurringCostSuggestionMock).toHaveBeenCalledWith(
        "template_1",
        "2026-04-09",
      );
    });

    it("skipCostSuggestionAction redirects to success after skipping one occurrence", async () => {
      skipRecurringCostSuggestionMock.mockResolvedValueOnce({ id: "skip_1" });

      const { skipCostSuggestionAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("cost_template_id", "template_1");
      formData.set("date", "2026-04-09");

      await expect(skipCostSuggestionAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=skipped&suggestionDate=2026-04-09",
      );
      expect(skipRecurringCostSuggestionMock).toHaveBeenCalledWith(
        "template_1",
        "2026-04-09",
      );
    });

    it("toggleCostTemplateActiveAction redirects back to costs after updating lifecycle state", async () => {
      setCostTemplateActiveStateMock.mockResolvedValueOnce({ id: "template_1" });

      const { toggleCostTemplateActiveAction } = await import(
        "@/app/admin/actions"
      );
      const formData = new FormData();

      formData.set("id", "template_1");
      formData.set("is_active", "on");
      formData.set("return_to", "/admin/costs");
      formData.set("suggestion_date", "2026-04-09");

      await expect(toggleCostTemplateActiveAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?success=template_updated&suggestionDate=2026-04-09",
      );
      expect(setCostTemplateActiveStateMock).toHaveBeenCalledWith(
        "template_1",
        true,
      );
    });

    it("saveContactAction redirects to success after creating a contact", async () => {
      createContactMock.mockResolvedValueOnce({ id: "contact_1" });

      const { saveContactAction } = await import("@/app/admin/actions");

      await expect(saveContactAction(buildContactFormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/contacts?success=saved",
      );
      expect(createContactMock).toHaveBeenCalledTimes(1);
    });

    it("deleteContactAction redirects to success after deleting a contact", async () => {
      deleteContactMock.mockResolvedValueOnce(undefined);

      const { deleteContactAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "contact_1");

      await expect(deleteContactAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/contacts?success=deleted",
      );
      expect(deleteContactMock).toHaveBeenCalledWith("contact_1");
    });

    it("saveOrderAction redirects to success after creating an order", async () => {
      createOrderMock.mockResolvedValueOnce({ id: "order_1" });

      const { saveOrderAction } = await import("@/app/admin/actions");

      await expect(saveOrderAction(buildOrderFormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/orders?success=saved",
      );
      expect(createOrderMock).toHaveBeenCalledTimes(1);
    });

    it("correctCompletedOrderAction redirects to success after correcting an order", async () => {
      correctCompletedOrderMock.mockResolvedValueOnce({ id: "order_1" });

      const { correctCompletedOrderAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "order_1");
      formData.set("quantity", "12");
      formData.set("unit_price", "16.50");
      formData.set("fulfilled_at", "2026-04-09T08:30");
      formData.set("note", "Corrected");

      await expect(correctCompletedOrderAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/orders?success=corrected",
      );
      expect(correctCompletedOrderMock).toHaveBeenCalledTimes(1);
    });

    it("saveHomepagePublicNoteSettingAction saves the toggle, revalidates the homepage, and redirects back to dashboard", async () => {
      updateHomepagePublicNoteEnabledMock.mockResolvedValueOnce({
        key: "homepage_public_note_enabled",
      });

      const { saveHomepagePublicNoteSettingAction } = await import(
        "@/app/admin/actions"
      );
      const formData = new FormData();

      formData.set("homepage_public_note_enabled", "on");
      formData.set("mode", "expanded");

      await expect(saveHomepagePublicNoteSettingAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/dashboard?mode=expanded&settingsSuccess=saved",
      );
      expect(updateHomepagePublicNoteEnabledMock).toHaveBeenCalledWith("on");
      expect(revalidatePathMock).toHaveBeenCalledWith("/");
    });

    it("saveNotificationCampaignAction redirects to the draft editor after saving", async () => {
      saveNotificationCampaignDraftMock.mockResolvedValueOnce({
        id: "campaign_1",
      });

      const { saveNotificationCampaignAction } = await import("@/app/admin/actions");

      await expect(
        saveNotificationCampaignAction(buildNotificationCampaignFormData()),
      ).rejects.toThrow(
        "NEXT_REDIRECT:/admin/notifications?success=saved&edit=campaign_1",
      );
      expect(saveNotificationCampaignDraftMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Spring update",
          channel: "email",
          audience_type: "selected_contacts",
          sender_label: "Jajce",
          selected_contact_ids: ["contact_1", "contact_2"],
        }),
        {
          campaignId: null,
        },
      );
    });

    it("sendNotificationCampaignAction redirects with sent success when all recipients succeed", async () => {
      sendNotificationCampaignMock.mockResolvedValueOnce({
        campaign_id: "campaign_1",
        status: "sent",
        recipient_count: 2,
        sent_recipient_count: 2,
        failed_recipient_count: 0,
      });

      const { sendNotificationCampaignAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "campaign_1");

      await expect(sendNotificationCampaignAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/notifications?success=sent",
      );
      expect(sendNotificationCampaignMock).toHaveBeenCalledWith("campaign_1");
    });

    it("sendNotificationCampaignAction redirects with failed success when any recipient fails", async () => {
      sendNotificationCampaignMock.mockResolvedValueOnce({
        campaign_id: "campaign_1",
        status: "failed",
        recipient_count: 2,
        sent_recipient_count: 1,
        failed_recipient_count: 1,
      });

      const { sendNotificationCampaignAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "campaign_1");

      await expect(sendNotificationCampaignAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/notifications?success=failed",
      );
    });
  });

  describe("cost entry error mapping", () => {
    it("keeps real validation failures mapped to error=validation", async () => {
      createCostEntryMock.mockRejectedValueOnce(
        new CostValidationError("Total amount must be a valid amount."),
      );

      const { saveCostEntryAction } = await import("@/app/admin/actions");

      await expect(saveCostEntryAction(buildCostEntryFormData())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/costs?error=validation&suggestionDate=2026-04-09",
      );
    });
  });

  describe("daily log error mapping", () => {
    it("maps stock-reduction blockers to the daily-log inventory_conflict code", async () => {
      const { DailyLogCollectedStockConflictError } = await import(
        "@/lib/services/daily-logs"
      );

      updateDailyLogMock.mockRejectedValueOnce(
        new DailyLogCollectedStockConflictError(
          "This change would remove sellable stock that is already reserved or sold.",
          3,
        ),
      );

      const { saveDailyLogAction } = await import("@/app/admin/actions");
      const formData = buildDailyLogFormData();

      formData.set("id", "daily_log_1");
      formData.set("eggs_collected_for_sale", "10");

      await expect(saveDailyLogAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/daily-logs?error=inventory_conflict&edit=daily_log_1",
      );
    });
  });

  describe("notification campaign error mapping", () => {
    it("maps no eligible recipients to a notification error code", async () => {
      const { NotificationCampaignNoEligibleRecipientsError } = await import(
        "@/lib/services/notification-campaigns"
      );

      sendNotificationCampaignMock.mockRejectedValueOnce(
        new NotificationCampaignNoEligibleRecipientsError("No eligible recipients."),
      );

      const { sendNotificationCampaignAction } = await import("@/app/admin/actions");
      const formData = new FormData();

      formData.set("id", "campaign_1");

      await expect(sendNotificationCampaignAction(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/admin/notifications?error=no_eligible_recipients&edit=campaign_1",
      );
    });
  });
});

function buildDailyLogFormData() {
  const formData = new FormData();

  formData.set("date", "2026-04-09");
  formData.set("eggs_total_yield", "31");
  formData.set("eggs_collected_for_sale", "28");
  formData.set("eggs_used_other_purpose", "2");
  formData.set("eggs_broken", "1");
  formData.set("eggs_unusable_other", "0");
  formData.set("chicken_count", "52");
  formData.set("public_note", "Fresh today");
  formData.set("notes", "Internal note");

  return formData;
}

function buildCostTemplateFormData() {
  const formData = new FormData();

  formData.set("name", "Weekly feed");
  formData.set("category", "feed");
  formData.set("cost_type", "direct");
  formData.set("default_quantity", "10");
  formData.set("default_unit", "kg");
  formData.set("default_unit_price", "1.50");
  formData.set("default_total_amount", "15.00");
  formData.set("frequency", "weekly");
  formData.set("start_date", "2026-04-01");
  formData.set("end_date", "");
  formData.set("is_active", "on");
  formData.set("note", "Template note");

  return formData;
}

function buildCostEntryFormData() {
  const formData = new FormData();

  formData.set("date", "2026-04-09");
  formData.set("category", "feed");
  formData.set("cost_type", "direct");
  formData.set("quantity", "10");
  formData.set("unit", "kg");
  formData.set("unit_price", "1.50");
  formData.set("total_amount", "15.00");
  formData.set("source_type", "manual");
  formData.set("cost_template_id", "");
  formData.set("note", "Feed cost");
  formData.set("suggestion_date", "2026-04-09");

  return formData;
}

function buildRecurringCostEntryFormData() {
  const formData = buildCostEntryFormData();

  formData.set("save_as_recurring", "on");
  formData.set("template_name", "Weekly feed");
  formData.set("recurring_frequency", "weekly");
  formData.set("recurring_start_date", "2026-04-09");
  formData.set("recurring_end_date", "");
  formData.set("recurring_is_active", "on");

  return formData;
}

function buildContactFormData() {
  const formData = new FormData();

  formData.set("full_name", "Ana Trajkovska");
  formData.set("email", "ana@example.com");
  formData.set("phone", "+38970111222");
  formData.set("is_subscriber", "on");
  formData.set("is_waiting_list", "");
  formData.set("is_active_customer", "");
  formData.set("email_opt_in", "on");
  formData.set("phone_opt_in", "");
  formData.set("preferred_channel", "email");
  formData.set("preferred_quantity", "12");
  formData.set("preference_unit", "week");
  formData.set("notification_frequency", "weekly");
  formData.set("customer_stage", "subscriber");
  formData.set("source", "Website");
  formData.set("joined_waiting_list_at", "");
  formData.set("became_customer_at", "");
  formData.set("notes", "New contact");

  return formData;
}

function buildOrderFormData() {
  const formData = new FormData();

  formData.set("contact_id", "contact_1");
  formData.set("date", "2026-04-09");
  formData.set("target_fulfillment_date", "2026-04-10");
  formData.set("quantity", "12");
  formData.set("status", "reserved");
  formData.set("price_source", "default");
  formData.set("unit_price", "16.50");
  formData.set("fulfilled_at", "");
  formData.set("note", "Order note");

  return formData;
}

function buildNotificationCampaignFormData() {
  const formData = new FormData();

  formData.set("title", "Spring update");
  formData.set("channel", "email");
  formData.set("audience_type", "selected_contacts");
  formData.set("subject", "Fresh eggs this week");
  formData.set("body", "We have fresh eggs available this week.");
  formData.append("selected_contact_ids", "contact_1");
  formData.append("selected_contact_ids", "contact_2");

  return formData;
}
