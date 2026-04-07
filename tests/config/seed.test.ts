import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTING_KEYS,
} from "@/lib/config/site-settings";
import {
  getInitialAdminSeedInput,
  seedInitialAdminIfMissing,
  type AdminCreateData,
} from "@/lib/config/admin-bootstrap";

describe("DEFAULT_SITE_SETTINGS", () => {
  it("covers every required MVP site setting key", () => {
    expect(Object.keys(DEFAULT_SITE_SETTINGS).sort()).toEqual(
      [...SITE_SETTING_KEYS].sort(),
    );
  });

  it("provides concrete defaults for the initial seed", () => {
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      default_egg_unit_price: 16,
      low_stock_threshold: 30,
      sender_label_default: "Jajce",
      homepage_availability_mode: "auto",
      homepage_public_note_enabled: false,
    });
  });
});

describe("getInitialAdminSeedInput", () => {
  it("returns null when no bootstrap env vars are present", () => {
    expect(getInitialAdminSeedInput({})).toBeNull();
  });

  it("normalizes the bootstrap email", () => {
    expect(
      getInitialAdminSeedInput({
        INITIAL_ADMIN_EMAIL: "ADMIN@JAJCE.MK",
        INITIAL_ADMIN_PASSWORD: "secret",
      }),
    ).toEqual({
      email: "admin@jajce.mk",
      password: "secret",
    });
  });

  it("throws when only one bootstrap env var is provided", () => {
    expect(() =>
      getInitialAdminSeedInput({
        INITIAL_ADMIN_EMAIL: "admin@jajce.mk",
      }),
    ).toThrow(/must both be set/i);
  });
});

describe("seedInitialAdminIfMissing", () => {
  it("creates the bootstrap admin when missing", async () => {
    const created: AdminCreateData[] = [];

    const result = await seedInitialAdminIfMissing({
      adminDelegate: {
        findUnique: async () => null,
        create: async ({ data }) => {
          created.push(data);
          return data;
        },
      },
      initialAdmin: {
        email: "admin@jajce.mk",
        password: "secret",
      },
      hashPassword: async () => "hashed-secret",
    });

    expect(result).toBe("created");
    expect(created).toEqual([
      {
        email: "admin@jajce.mk",
        password_hash: "hashed-secret",
        is_active: true,
      },
    ]);
  });

  it("does not overwrite an existing admin", async () => {
    let createCalls = 0;
    let hashCalls = 0;

    const result = await seedInitialAdminIfMissing({
      adminDelegate: {
        findUnique: async () => ({ id: "admin_1" }),
        create: async () => {
          createCalls += 1;
          return null;
        },
      },
      initialAdmin: {
        email: "admin@jajce.mk",
        password: "secret",
      },
      hashPassword: async () => {
        hashCalls += 1;
        return "hashed-secret";
      },
    });

    expect(result).toBe("exists");
    expect(createCalls).toBe(0);
    expect(hashCalls).toBe(0);
  });
});
