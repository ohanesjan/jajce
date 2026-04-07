import { describe, expect, it } from "vitest";
import {
  formatDateTimeLocalInTimeZone,
  parseDateTimeLocalInTimeZone,
} from "@/lib/utils/date";

describe("datetime-local timezone helpers", () => {
  it("formats fulfillment timestamps in the configured local timezone", () => {
    expect(
      formatDateTimeLocalInTimeZone(
        new Date("2026-04-03T07:30:00.000Z"),
        "Europe/Amsterdam",
      ),
    ).toBe("2026-04-03T09:30");
  });

  it("parses local datetime input back to the correct UTC timestamp", () => {
    expect(
      parseDateTimeLocalInTimeZone(
        "2026-04-03T09:30",
        "Europe/Amsterdam",
      ).toISOString(),
    ).toBe("2026-04-03T07:30:00.000Z");
  });
});
