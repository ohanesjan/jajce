export const ADMIN_LANGUAGE = "mk" as const;
export type AdminLanguage = typeof ADMIN_LANGUAGE | "en";

export const ADMIN_LANGUAGE_COOKIE_NAME = "jajce_admin_language";

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "mk" || value === "en";
}

export function parseAdminLanguage(value: unknown): AdminLanguage {
  return isAdminLanguage(value) ? value : ADMIN_LANGUAGE;
}
