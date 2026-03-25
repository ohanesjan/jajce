"use client";

import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function Hero() {
  const { language } = useLanguage();
  const copy = translations[language];

  return (
    <section
      className="relative flex min-h-screen items-end overflow-hidden"
      aria-label="Hero"
    >
      <LanguageSwitch />
      <div
        className="absolute inset-0 scale-[1.03] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/mountain1.jpg')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,9,0.88)_0%,rgba(9,9,9,0.72)_34%,rgba(9,9,9,0.42)_58%,rgba(9,9,9,0.2)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(142,185,200,0.16),transparent_26%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas via-canvas/40 to-transparent" />

      <div className="section-shell relative z-10 flex w-full py-14 md:py-20">
        <div className="max-w-[42rem] rounded-[2.2rem] bg-black/12 px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-[1.5px] md:px-8 md:py-10">
          <p className="mb-5 text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-sky/90">
            {copy.heroEyebrow}
          </p>
          <h1 className="max-w-2xl font-serif text-[3.35rem] leading-[0.93] tracking-[-0.03em] text-white md:text-[5.6rem]">
            {copy.heroTitle}
          </h1>
          <p
            className="mt-7 max-w-[34rem] text-[1.08rem] leading-8 text-white md:text-[1.28rem]"
            style={{ textShadow: "0 2px 18px rgba(0, 0, 0, 0.45)" }}
          >
            {copy.heroCopy}
          </p>
          <div className="mt-11 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <a
              href="#notify"
              className="rounded-full bg-sky px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.24em] text-bark transition hover:bg-[#a9cdd9]"
            >
              {copy.heroCta}
            </a>
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-white/95">
              {copy.heroMeta}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
