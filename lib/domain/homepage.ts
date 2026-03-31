export type HomepageAvailabilityState = "none" | "limited" | "available";
export type HomepageAvailabilityLocale = "mk" | "en";

const HOMEPAGE_AVAILABILITY_MESSAGES: Record<
  HomepageAvailabilityLocale,
  Record<HomepageAvailabilityState, string>
> = {
  mk: {
    none: "Моментално нема достапни јајца",
    limited: "Ограничена достапност",
    available: "Достапни се свежи јајца",
  },
  en: {
    none: "No eggs are currently available",
    limited: "Limited availability",
    available: "Fresh eggs are available",
  },
};

export type HomepageAvailabilityInput = {
  available_eggs: number;
  low_stock_threshold: number;
  locale?: HomepageAvailabilityLocale;
};

export type HomepageAvailabilityResult = {
  state: HomepageAvailabilityState;
  message: string;
};

export function deriveHomepageAvailabilityMessage({
  available_eggs,
  low_stock_threshold,
  locale = "mk",
}: HomepageAvailabilityInput): HomepageAvailabilityResult {
  const state =
    available_eggs <= 0
      ? "none"
      : available_eggs <= low_stock_threshold
        ? "limited"
        : "available";

  return {
    state,
    message: HOMEPAGE_AVAILABILITY_MESSAGES[locale][state],
  };
}
