import "server-only";

import { cookies } from "next/headers";
import {
  ADMIN_LANGUAGE,
  ADMIN_LANGUAGE_COOKIE_NAME,
  parseAdminLanguage,
  type AdminLanguage,
} from "@/lib/admin-language";

const ADMIN_LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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
