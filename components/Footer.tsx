"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function Footer() {
  const { language } = useLanguage();
  const copy = translations[language];

  return (
    <footer className="border-t border-soil/10 bg-[#ece1cf]">
      <div className="section-shell flex flex-col gap-6 py-10 text-sm text-bark/70 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-serif text-[2rem] text-bark">Jajce</p>
          <p className="mt-2 text-[0.76rem] font-semibold uppercase tracking-[0.24em] text-soil/70">
            {copy.footerTagline}
          </p>
        </div>
        <div className="space-y-1 text-left md:text-right">
          <p>{copy.footerContact}</p>
          <p>{copy.footerCopyright}</p>
        </div>
      </div>
    </footer>
  );
}
