import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookiesMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("server-only", () => ({}));

describe("admin language cookie helper", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to Macedonian when the cookie is missing or invalid", async () => {
    cookiesMock.mockResolvedValueOnce({
      get: vi.fn(() => undefined),
    });

    const { getAdminLanguage } = await import("@/lib/admin-language.server");

    await expect(getAdminLanguage()).resolves.toBe("mk");

    cookiesMock.mockResolvedValueOnce({
      get: vi.fn(() => ({ value: "de" })),
    });

    await expect(getAdminLanguage()).resolves.toBe("mk");
  });

  it("reads the saved admin language cookie when valid", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => ({ value: "en" })),
    });

    const { getAdminLanguage } = await import("@/lib/admin-language.server");

    await expect(getAdminLanguage()).resolves.toBe("en");
  });

  it("writes the admin language cookie under /admin", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
    };

    const cookieStore = {
      get: vi.fn(),
      set: vi.fn(),
    };

    cookiesMock.mockResolvedValue(cookieStore);

    const {
      ADMIN_LANGUAGE_COOKIE_NAME,
    } = await import("@/lib/admin-language");
    const { setAdminLanguageCookie } = await import(
      "@/lib/admin-language.server"
    );

    await setAdminLanguageCookie("en");

    expect(cookieStore.set).toHaveBeenCalledWith(
      ADMIN_LANGUAGE_COOKIE_NAME,
      "en",
      expect.objectContaining({
        httpOnly: true,
        path: "/admin",
        sameSite: "lax",
        secure: true,
      }),
    );
  });
});
