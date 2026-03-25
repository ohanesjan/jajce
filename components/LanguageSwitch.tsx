"use client";

import { useLanguage } from "@/context/LanguageContext";

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="absolute right-6 top-6 z-20 md:right-10 md:top-8">
      <div className="flex items-center gap-2 rounded-full bg-black/10 px-3 py-2 text-[0.76rem] uppercase tracking-[0.24em] text-white/75 backdrop-blur-[2px]">
        <button
          type="button"
          onClick={() => setLanguage("mk")}
          className={
            language === "mk"
              ? "font-semibold text-white underline underline-offset-4"
              : "transition hover:text-white"
          }
          aria-pressed={language === "mk"}
        >
          MK
        </button>
        <span className="text-white/35">|</span>
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={
            language === "en"
              ? "font-semibold text-white underline underline-offset-4"
              : "transition hover:text-white"
          }
          aria-pressed={language === "en"}
        >
          EN
        </button>
      </div>
    </div>
  );
}
