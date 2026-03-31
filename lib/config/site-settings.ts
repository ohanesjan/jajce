export const SITE_SETTING_KEYS = [
  "default_egg_unit_price",
  "low_stock_threshold",
  "sender_label_default",
  "homepage_availability_mode",
  "homepage_public_note_enabled",
] as const;

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

export const DEFAULT_SITE_SETTINGS: Record<SiteSettingKey, boolean | number | string> =
  {
    default_egg_unit_price: 16,
    low_stock_threshold: 30,
    sender_label_default: "Jajce",
    homepage_availability_mode: "auto",
    homepage_public_note_enabled: false,
  };
