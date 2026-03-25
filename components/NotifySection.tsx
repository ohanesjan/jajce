"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function NotifySection() {
  const { language } = useLanguage();
  const copy = translations[language];

  return (
    <section className="section-shell py-24 md:py-32" id="notify">
      <div className="card-surface relative overflow-hidden px-6 py-12 md:px-14 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(142,185,200,0.16),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_50%)]" />
        <div className="relative mx-auto max-w-[44rem] text-center">
          <p className="eyebrow">{copy.notifyEyebrow}</p>
          <h2 className="section-title mt-5">{copy.notifyTitle}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-[1.04rem] leading-8 text-bark/74 md:text-[1.12rem]">
            {copy.notifyCopy}
          </p>

          <form
            className="mt-11 flex flex-col gap-4 sm:flex-row"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="sr-only" htmlFor="contact">
              {copy.notifyPlaceholder}
            </label>
            <input
              id="contact"
              name="contact"
              type="text"
              placeholder={copy.notifyPlaceholder}
              className="min-h-14 flex-1 rounded-full border border-soil/12 bg-white/92 px-6 text-base text-bark shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] placeholder:text-bark/40 focus:border-sky focus:outline-none focus:ring-2 focus:ring-sky/25"
            />
            <button
              type="submit"
              className="min-h-14 rounded-full bg-bark px-8 text-sm font-semibold uppercase tracking-[0.24em] text-parchment transition hover:bg-[#4b3f37]"
            >
              {copy.notifyButton}
            </button>
          </form>

          <p className="mt-5 text-sm text-bark/60">{copy.notifyMeta}</p>
        </div>
      </div>
    </section>
  );
}
