import { cookies } from "next/headers";

export const ADMIN_LANGUAGE = "mk" as const;
export type AdminLanguage = typeof ADMIN_LANGUAGE | "en";

export const ADMIN_LANGUAGE_COOKIE_NAME = "jajce_admin_language";

const ADMIN_LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "mk" || value === "en";
}

export function parseAdminLanguage(value: unknown): AdminLanguage {
  return isAdminLanguage(value) ? value : ADMIN_LANGUAGE;
}

export async function getAdminLanguage(): Promise<AdminLanguage> {
  try {
    const cookieStore = await cookies();

    return parseAdminLanguage(
      cookieStore.get(ADMIN_LANGUAGE_COOKIE_NAME)?.value,
    );
  } catch {
    return ADMIN_LANGUAGE;
  }
}

export async function setAdminLanguageCookie(
  language: AdminLanguage,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_LANGUAGE_COOKIE_NAME, language, {
    httpOnly: true,
    maxAge: ADMIN_LANGUAGE_COOKIE_MAX_AGE_SECONDS,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
