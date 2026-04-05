import { describe, expect, it } from "vitest";
import { ADMIN_LANGUAGE } from "@/lib/admin-language";
import {
  getAdminCopy,
  formatAdminActiveState,
  formatAdminRecurringSchedule,
  formatAdminValueLabel,
} from "@/lib/admin-localization";

describe("admin localization helpers", () => {
  it("defaults admin language to Macedonian", () => {
    expect(ADMIN_LANGUAGE).toBe("mk");
    expect(getAdminCopy().login.email).toBe("Е-пошта");
  });

  it("maps admin-visible enum values to Macedonian labels", () => {
    expect(formatAdminValueLabel("manual_override")).toBe("Рачно зададена");
    expect(formatAdminValueLabel("active_customers")).toBe("Активни купувачи");
    expect(formatAdminValueLabel("email")).toBe("Е-пошта");
    expect(formatAdminValueLabel("whatsapp")).toBe("WhatsApp");
  });

  it("returns English admin copy when requested", () => {
    expect(getAdminCopy("en").common.appName).toBe("Jajce Admin");
    expect(getAdminCopy("en").login.signIn).toBe("Sign in");
    expect(formatAdminValueLabel("manual_override", "en")).toBe("Manual override");
  });

  it("formats recurring schedules in Macedonian without changing dates", () => {
    expect(
      formatAdminRecurringSchedule({
        frequency: "weekly",
        start_date: new Date("2026-04-02T00:00:00.000Z"),
        end_date: new Date("2026-05-02T00:00:00.000Z"),
      }),
    ).toBe("Неделно од 2026-04-02 до 2026-05-02");
  });

  it("formats active state labels in Macedonian", () => {
    expect(formatAdminActiveState(true)).toBe("Активен");
    expect(formatAdminActiveState(false)).toBe("Неактивен");
  });

  it("formats recurring schedules and active state labels in English", () => {
    expect(
      formatAdminRecurringSchedule(
        {
          frequency: "weekly",
          start_date: new Date("2026-04-02T00:00:00.000Z"),
          end_date: new Date("2026-05-02T00:00:00.000Z"),
        },
        "en",
      ),
    ).toBe("Weekly from 2026-04-02 until 2026-05-02");
    expect(formatAdminActiveState(true, "en")).toBe("Active");
    expect(formatAdminActiveState(false, "en")).toBe("Inactive");
  });
});
