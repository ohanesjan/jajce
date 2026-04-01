import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const authenticateAdminCredentialsMock = vi.fn();
const beginAdminSessionMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
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
  clearAdminSession: vi.fn(),
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    admin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }),
}));

describe("loginAdminAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
