"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { HomepageAvailabilityMessages } from "@/lib/services/homepage";
import { translations } from "@/lib/translations";

export default function AvailabilityNote({
  today,
  yesterday,
  chickens,
  availabilityMessages,
  publicNote,
  compact = false,
}: {
  today: number | null;
  yesterday: number | null;
  chickens: number | null;
  availabilityMessages: HomepageAvailabilityMessages;
  publicNote: string | null;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  const copy = translations[language];
  const availabilityMessage =
    language === "en" ? availabilityMessages.en : availabilityMessages.mk;

  if (compact) {
    return (
      <div className="mx-auto mt-4 max-w-[42rem]">
        <div className="mb-4 text-center">
          <p className="text-[0.76rem] font-semibold uppercase tracking-[0.22em] text-soil/72">
            {availabilityMessage}
          </p>
          {publicNote ? (
            <p className="mt-2 text-sm leading-6 text-bark/72">{publicNote}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-[1.4rem] bg-white/22 px-4 py-3 text-center shadow-[0_10px_26px_rgba(59,49,43,0.04)] backdrop-blur-sm md:px-6">
          <div className="px-2">
            <p className="text-[0.66rem] uppercase tracking-[0.22em] text-bark/45">
              {copy.availabilityToday}
            </p>
            <p className="mt-1 font-serif text-[1.08rem] tracking-[0.02em] text-bark/80 md:text-[1.2rem]">
              {formatMetricValue(today, copy.availabilityEggUnit)}
            </p>
          </div>

          <div className="border-x border-soil/10 px-2">
            <p className="text-[0.66rem] uppercase tracking-[0.22em] text-bark/40">
              {copy.availabilityYesterday}
            </p>
            <p className="mt-1 font-serif text-[1rem] tracking-[0.02em] text-bark/68 md:text-[1.12rem]">
              {formatMetricValue(yesterday, copy.availabilityEggUnit)}
            </p>
          </div>

          <div className="px-2">
            <p className="text-[0.66rem] uppercase tracking-[0.22em] text-bark/40">
              {copy.availabilityFlock}
            </p>
            <p className="mt-1 font-serif text-[1rem] tracking-[0.02em] text-bark/68 md:text-[1.12rem]">
              {formatMetricValue(chickens, copy.availabilityChickenUnit)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell mt-5">
      <div className="h-px w-16 mx-auto bg-gray-200/50" />

      <div className="mx-auto mt-3 max-w-3xl text-center">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-soil/72">
          {availabilityMessage}
        </p>
        {publicNote ? (
          <p className="mt-2 text-sm leading-6 text-bark/72">{publicNote}</p>
        ) : null}
      </div>

      <div className="mx-auto mt-3 max-w-3xl rounded-[1.45rem] border border-white/45 bg-white/28 px-4 py-3 text-center text-gray-500 shadow-[0_12px_30px_rgba(59,49,43,0.06)] backdrop-blur-sm md:px-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="px-2">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-bark/45">
              {copy.availabilityToday}
            </p>
            <p className="mt-1 font-serif text-[1.1rem] tracking-[0.02em] text-bark/80 md:text-[1.25rem]">
              {formatMetricValue(today, copy.availabilityEggUnit)}
            </p>
          </div>

          <div className="border-x border-soil/10 px-2">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-bark/40">
              {copy.availabilityYesterday}
            </p>
            <p className="mt-1 font-serif text-[1rem] tracking-[0.02em] text-bark/68 md:text-[1.15rem]">
              {formatMetricValue(yesterday, copy.availabilityEggUnit)}
            </p>
          </div>

          <div className="px-2">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-bark/40">
              {copy.availabilityFlock}
            </p>
            <p className="mt-1 font-serif text-[1rem] tracking-[0.02em] text-bark/68 md:text-[1.15rem]">
              {formatMetricValue(chickens, copy.availabilityChickenUnit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) {
    return "--";
  }

  return unit.length > 0 ? `${value} ${unit}` : String(value);
}
