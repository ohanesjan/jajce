import { describe, expect, it, vi } from "vitest";
import {
  authenticateAdminCredentials,
  createAdminSessionToken,
  getAdminLoginRedirectPath,
  getProtectedAdminRedirectPath,
  normalizeAdminEmail,
  readAdminSessionToken,
} from "@/lib/services/admin-auth";

describe("normalizeAdminEmail", () => {
  it("trims whitespace and lowercases the email", () => {
    expect(normalizeAdminEmail("  ADMIN@JAJCE.MK ")).toBe("admin@jajce.mk");
  });
});

describe("authenticateAdminCredentials", () => {
  it("updates last_login_at and returns the authenticated admin", async () => {
    const now = new Date("2026-04-01T08:30:00.000Z");
    const update = vi.fn(async () => ({
      id: "admin_1",
      email: "admin@jajce.mk",
      last_login_at: now,
    }));

    const authenticatedAdmin = await authenticateAdminCredentials({
      adminDelegate: {
        findUnique: vi.fn(async () => ({
          id: "admin_1",
          email: "admin@jajce.mk",
          password_hash: "stored-hash",
          is_active: true,
          last_login_at: null,
        })),
        update,
      } as never,
      email: "ADMIN@JAJCE.MK",
      password: "secret",
      now,
      verifyPasswordFn: vi.fn(async () => true),
    });

    expect(authenticatedAdmin).toEqual({
      id: "admin_1",
      email: "admin@jajce.mk",
      last_login_at: now,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "admin_1" },
      data: { last_login_at: now },
      select: {
        id: true,
        email: true,
        last_login_at: true,
      },
    });
  });

  it("returns null for inactive or invalid credentials", async () => {
    const inactiveAdminResult = await authenticateAdminCredentials({
      adminDelegate: {
        findUnique: vi.fn(async () => ({
          id: "admin_1",
          email: "admin@jajce.mk",
          password_hash: "stored-hash",
          is_active: false,
          last_login_at: null,
        })),
        update: vi.fn(),
      } as never,
      email: "admin@jajce.mk",
      password: "secret",
      verifyPasswordFn: vi.fn(async () => true),
    });

    const invalidPasswordResult = await authenticateAdminCredentials({
      adminDelegate: {
        findUnique: vi.fn(async () => ({
          id: "admin_1",
          email: "admin@jajce.mk",
          password_hash: "stored-hash",
          is_active: true,
          last_login_at: null,
        })),
        update: vi.fn(),
      } as never,
      email: "admin@jajce.mk",
      password: "wrong",
      verifyPasswordFn: vi.fn(async () => false),
    });

    expect(inactiveAdminResult).toBeNull();
    expect(invalidPasswordResult).toBeNull();
  });
});

describe("admin session tokens", () => {
  it("round-trips a signed token payload", () => {
    const token = createAdminSessionToken(
      {
        adminId: "admin_1",
        expiresAt: new Date("2026-04-08T08:30:00.000Z").getTime(),
      },
      "test-secret",
    );

    expect(readAdminSessionToken(token, "test-secret")).toEqual({
      adminId: "admin_1",
      expiresAt: new Date("2026-04-08T08:30:00.000Z").getTime(),
    });
  });

  it("rejects expired or tampered tokens", () => {
    const expiredToken = createAdminSessionToken(
      {
        adminId: "admin_1",
        expiresAt: new Date("2026-04-01T08:29:59.000Z").getTime(),
      },
      "test-secret",
    );
    const validToken = createAdminSessionToken(
      {
        adminId: "admin_1",
        expiresAt: new Date("2026-04-08T08:30:00.000Z").getTime(),
      },
      "test-secret",
    );

    expect(
      readAdminSessionToken(
        expiredToken,
        "test-secret",
        new Date("2026-04-01T08:30:00.000Z"),
      ),
    ).toBeNull();
    expect(readAdminSessionToken(`${validToken}x`, "test-secret")).toBeNull();
  });
});

describe("admin route redirect helpers", () => {
  it("returns the login path when a protected route is unauthenticated", () => {
    expect(getProtectedAdminRedirectPath(null)).toBe("/admin/login");
  });

  it("returns the dashboard path when the login page already has a session", () => {
    expect(
      getAdminLoginRedirectPath({
        id: "admin_1",
        email: "admin@jajce.mk",
        last_login_at: null,
      }),
    ).toBe("/admin/dashboard");
  });
});
