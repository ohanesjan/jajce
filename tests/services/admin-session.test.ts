import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const cookiesMock = vi.fn();
const adminFindUniqueMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    admin: {
      findUnique: adminFindUniqueMock,
    },
  }),
}));

describe("admin session behavior", () => {
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

  it("sets a signed httpOnly session cookie with lax sameSite semantics", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      ADMIN_SESSION_SECRET: "test-session-secret",
    };

    const cookieStore = {
      set: vi.fn(),
      get: vi.fn(),
    };

    cookiesMock.mockResolvedValue(cookieStore);

    const {
      ADMIN_SESSION_COOKIE_NAME,
      ADMIN_SESSION_MAX_AGE_SECONDS,
    } = await import("@/lib/services/admin-auth");
    const { beginAdminSession } = await import("@/lib/services/admin-session");

    await beginAdminSession(
      {
        id: "admin_1",
      },
      new Date("2026-04-01T08:30:00.000Z"),
    );

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue, cookieOptions] = cookieStore.set.mock.calls[0];

    expect(cookieName).toBe(ADMIN_SESSION_COOKIE_NAME);
    expect(typeof cookieValue).toBe("string");
    expect(cookieValue).toContain(".");
    expect(cookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
  });

  it("clears the admin session cookie on logout", async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      ADMIN_SESSION_SECRET: "test-session-secret",
    };

    const cookieStore = {
      set: vi.fn(),
      get: vi.fn(),
    };

    cookiesMock.mockResolvedValue(cookieStore);

    const { ADMIN_SESSION_COOKIE_NAME } = await import(
      "@/lib/services/admin-auth"
    );
    const { clearAdminSession } = await import("@/lib/services/admin-session");

    await clearAdminSession();

    expect(cookieStore.set).toHaveBeenCalledWith(
      ADMIN_SESSION_COOKIE_NAME,
      "",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      }),
    );
  });

  it("redirects protected admin routes to login when there is no session", async () => {
    const cookieStore = {
      set: vi.fn(),
      get: vi.fn(() => undefined),
    };

    cookiesMock.mockResolvedValue(cookieStore);

    const { requireAdminSession } = await import("@/lib/services/admin-session");

    await expect(requireAdminSession()).rejects.toThrow(
      "NEXT_REDIRECT:/admin/login",
    );
    expect(redirectMock).toHaveBeenCalledWith("/admin/login");
  });

  it("returns the authenticated admin session without redirecting", async () => {
    process.env = {
      ...process.env,
      ADMIN_SESSION_SECRET: "test-session-secret",
    };

    const { createAdminSessionToken } = await import("@/lib/services/admin-auth");
    const sessionToken = createAdminSessionToken(
      {
        adminId: "admin_1",
        expiresAt: new Date("2026-04-08T08:30:00.000Z").getTime(),
      },
      "test-session-secret",
    );
    const cookieStore = {
      set: vi.fn(),
      get: vi.fn(() => ({ value: sessionToken })),
    };

    cookiesMock.mockResolvedValue(cookieStore);
    adminFindUniqueMock.mockResolvedValueOnce({
      id: "admin_1",
      email: "admin@jajce.mk",
      is_active: true,
    });

    const { requireAdminSession } = await import("@/lib/services/admin-session");

    await expect(requireAdminSession()).resolves.toEqual({
      admin: {
        id: "admin_1",
        email: "admin@jajce.mk",
      },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
