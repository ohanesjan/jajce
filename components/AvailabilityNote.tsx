"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function AvailabilityNote({
  today = 42,
  yesterday = 38,
  chickens = 125,
}: {
  today?: number;
  yesterday?: number;
  chickens?: number;
}) {
  const { language } = useLanguage();
  const copy = translations[language];

  return (
    <div className="section-shell mt-5">
      <div className="h-px w-16 mx-auto bg-gray-200/50" />

      <div className="mx-auto mt-3 max-w-3xl rounded-[1.45rem] border border-white/45 bg-white/28 px-4 py-3 text-center text-gray-500 shadow-[0_12px_30px_rgba(59,49,43,0.06)] backdrop-blur-sm md:px-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="px-2">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-bark/45">
              {copy.availabilityToday}
            </p>
            <p className="mt-1 font-serif text-[1.1rem] tracking-[0.02em] text-bark/80 md:text-[1.25rem]">
              {today} {copy.availabilityEggUnit}
            </p>
          </div>

          <div className="border-x border-soil/10 px-2">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-bark/40">
              {copy.availabilityYesterday}
            </p>
            <p className="mt-1 font-serif text-[1rem] tracking-[0.02em] text-bark/68 md:text-[1.15rem]">
              {yesterday} {copy.availabilityEggUnit}
            </p>
          </div>

          <div className="px-2">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-bark/40">
              {copy.availabilityFlock}
            </p>
            <p className="mt-1 font-serif text-[1rem] tracking-[0.02em] text-bark/68 md:text-[1.15rem]">
              {chickens}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
