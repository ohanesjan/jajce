import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listContactsMock = vi.fn();
const listNotificationCampaignsMock = vi.fn();
const getSenderLabelDefaultMock = vi.fn();

vi.mock("@/lib/services/contacts", () => ({
  listContacts: listContactsMock,
}));

vi.mock("@/lib/services/notification-campaigns", () => ({
  listNotificationCampaigns: listNotificationCampaignsMock,
}));

vi.mock("@/lib/services/site-settings", () => ({
  getSenderLabelDefault: getSenderLabelDefaultMock,
}));

vi.mock("@/app/admin/actions", () => ({
  saveNotificationCampaignAction: vi.fn(),
  sendNotificationCampaignAction: vi.fn(),
}));

describe("AdminNotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listContactsMock.mockResolvedValue([
      {
        id: "contact_1",
        full_name: "Ana",
        email: "ana@example.com",
        phone: null,
      },
    ]);
    getSenderLabelDefaultMock.mockResolvedValue("Jajce");
    listNotificationCampaignsMock.mockResolvedValue([
      {
        id: "campaign_1",
        title: "Weekly availability",
        channel: "email",
        audience_type: "selected_contacts",
        sender_label: "Jajce",
        subject: "Fresh eggs this week",
        body: "Fresh eggs are available.",
        status: "draft",
        sent_at: null,
        created_at: new Date("2026-04-05T08:00:00.000Z"),
        updated_at: new Date("2026-04-05T08:00:00.000Z"),
        selected_contact_ids: ["contact_1"],
        recipient_count: 0,
        pending_recipient_count: 0,
        sent_recipient_count: 0,
        failed_recipient_count: 0,
        is_recoverable_send_only: false,
      },
      {
        id: "campaign_2",
        title: "Previous send",
        channel: "email",
        audience_type: "subscribers",
        sender_label: "Jajce",
        subject: "Already sent",
        body: "Sent already.",
        status: "failed",
        sent_at: new Date("2026-04-04T08:00:00.000Z"),
        created_at: new Date("2026-04-04T08:00:00.000Z"),
        updated_at: new Date("2026-04-04T08:00:00.000Z"),
        selected_contact_ids: [],
        recipient_count: 3,
        pending_recipient_count: 0,
        sent_recipient_count: 2,
        failed_recipient_count: 1,
        is_recoverable_send_only: false,
      },
    ]);
  });

  it("renders the draft editor and history actions", async () => {
    const { default: AdminNotificationsPage } = await import(
      "@/app/admin/(protected)/notifications/page"
    );

    const markup = renderToStaticMarkup(
      await AdminNotificationsPage({
        searchParams: Promise.resolve({ edit: "campaign_1" }),
      }),
    );

    expect(markup).toContain("Измени нацрт-известување");
    expect(markup).toContain("Испрати го овој нацрт");
    expect(markup).toContain("Weekly availability");
    expect(markup).toContain(">Испрати</button>");
  });

  it("shows a read-only note when a sent or failed campaign is requested for editing", async () => {
    const { default: AdminNotificationsPage } = await import(
      "@/app/admin/(protected)/notifications/page"
    );

    const markup = renderToStaticMarkup(
      await AdminNotificationsPage({
        searchParams: Promise.resolve({ edit: "campaign_2" }),
      }),
    );

    expect(markup).toContain("Креирај нацрт-известување");
    expect(markup).toContain(
      "Испратените и неуспешните кампањи се само за читање. Празната форма подолу служи за креирање нов нацрт, а не за уредување на оваа кампања.",
    );
    expect(markup).toContain("Previous send");
  });

  it("shows a recoverable draft as send-only instead of editable", async () => {
    listNotificationCampaignsMock.mockResolvedValueOnce([
      {
        id: "campaign_1",
        title: "Recoverable draft",
        channel: "email",
        audience_type: "subscribers",
        sender_label: "Jajce",
        subject: "Pending send",
        body: "Pending body",
        status: "draft",
        sent_at: null,
        created_at: new Date("2026-04-05T08:00:00.000Z"),
        updated_at: new Date("2026-04-05T08:00:00.000Z"),
        selected_contact_ids: [],
        recipient_count: 2,
        pending_recipient_count: 1,
        sent_recipient_count: 1,
        failed_recipient_count: 0,
        is_recoverable_send_only: true,
      },
    ]);

    const { default: AdminNotificationsPage } = await import(
      "@/app/admin/(protected)/notifications/page"
    );

    const markup = renderToStaticMarkup(
      await AdminNotificationsPage({
        searchParams: Promise.resolve({ edit: "campaign_1" }),
      }),
    );

    expect(markup).toContain(
      "Овој нацрт веќе има зачувани редови за приматели, па е достапен само за испраќање",
    );
    expect(markup).toContain(">Продолжи со испраќање на зачуваната снимка</button>");
    expect(markup).not.toContain("Измени нацрт-известување");
  });
});
