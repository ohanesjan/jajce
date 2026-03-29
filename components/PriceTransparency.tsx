"use client";

import { useId, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

const content = {
  mk: {
    price: "16 денари по јајце",
    subtitle: "Природно произведени, во ограничени количини.",
    transparencyLead:
      "Не плаќате само за јајце — туку и за начинот на кој е произведено.",
    transparencyIntro: "Веруваме во целосна транспарентност.",
    toggleOpen: "Зошто оваа цена",
    toggleClose: "Сокриј",
    totalLabel: "Вкупно",
    breakdown: {
      feed: "Храна",
      care: "Грижа и време",
      land: "Земја и одржување",
      packaging: "Пакување",
      margin: "Маржа",
    },
  },
  en: {
    price: "16 MKD per egg",
    subtitle: "Naturally produced, in limited quantities.",
    transparencyLead:
      "You’re not just paying for an egg — but for how it’s produced.",
    transparencyIntro: "We believe in complete transparency.",
    toggleOpen: "Why this price",
    toggleClose: "Hide breakdown",
    totalLabel: "Total",
    breakdown: {
      feed: "Feed",
      care: "Care and time",
      land: "Land and upkeep",
      packaging: "Packaging",
      margin: "Margin",
    },
  },
} as const;

const breakdownValues = [
  {
    key: "feed",
    value: "6 ден",
    percent: 37.5,
    barClassName: "bg-[#9e7f68]",
  },
  {
    key: "care",
    value: "6 ден",
    percent: 37.5,
    barClassName: "bg-[#b7957d]",
  },
  {
    key: "land",
    value: "2.5 ден",
    percent: 15.625,
    barClassName: "bg-[#b6b597]",
  },
  {
    key: "packaging",
    value: "0.5 ден",
    percent: 3.125,
    barClassName: "bg-[#d9cfbf]",
  },
  {
    key: "margin",
    value: "1 ден",
    percent: 6.25,
    barClassName: "border border-[#cab79f] bg-transparent",
  },
] as const;

export default function PriceTransparency({ compact = false }: { compact?: boolean }) {
  const { language } = useLanguage();
  const copy = content[language] ?? content.mk;
  const [isOpen, setIsOpen] = useState(false);
  const breakdownId = useId();

  return (
    <section
      className={compact ? "pt-10 md:pt-12" : "section-shell py-16 md:py-20"}
      aria-label="Price transparency"
    >
      <div className="mx-auto max-w-[38rem] text-center">
        <p className="font-serif text-[2rem] leading-tight text-bark md:text-[2.5rem]">
          {copy.price}
        </p>
        <p className="mt-4 text-[1rem] text-bark/72 md:text-[1.06rem]">
          {copy.subtitle}
        </p>
        <p className="mx-auto mt-5 max-w-[34rem] text-[1rem] leading-8 text-bark/74 md:text-[1.05rem]">
          {copy.transparencyLead}
        </p>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="group mt-8 inline-flex items-center justify-center gap-2 py-1 text-sm text-stone-600 transition-colors duration-200 hover:text-stone-800 focus:outline-none"
          aria-expanded={isOpen}
          aria-controls={breakdownId}
        >
          <span className="underline-offset-4 group-hover:underline">
            {isOpen ? copy.toggleClose : copy.toggleOpen}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={`h-3 w-3 shrink-0 transition-transform duration-300 ease-out ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
            fill="none"
          >
            <path
              d="M2.25 4.5 6 8.25 9.75 4.5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          id={breakdownId}
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isOpen
              ? "mt-6 max-h-[40rem] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div
            className={`transition-all duration-300 ease-out ${
              isOpen ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            <p
              className="mx-auto max-w-[34rem] text-[0.84rem] uppercase tracking-[0.2em] text-soil/72"
            >
              {copy.transparencyIntro}
            </p>
            <div
              className="mx-auto mt-5 max-w-[36rem] rounded-[1.7rem] bg-white/28 px-5 py-6 text-left shadow-[0_16px_38px_rgba(59,49,43,0.05)] backdrop-blur-sm md:px-7"
            >
              <div className="space-y-4">
                {breakdownValues.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 md:grid-cols-[160px_1fr_72px]"
                  >
                    <p className="text-sm text-bark/72">
                      {copy.breakdown[item.key]}
                    </p>

                    <div className="h-[0.38rem] rounded-full bg-[#e8dfd2]">
                      <div
                        className={`h-full rounded-full ${item.barClassName}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>

                    <p className="text-sm text-right text-bark/65">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-soil/10 pt-4">
                <p className="text-[0.76rem] uppercase tracking-[0.18em] text-soil/72">
                  {copy.totalLabel}
                </p>
                <p className="font-serif text-[1.2rem] text-bark">16 ден</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
