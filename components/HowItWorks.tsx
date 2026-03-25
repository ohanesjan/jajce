"use client";

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function HowItWorks() {
  const { language } = useLanguage();
  const copy = translations[language];
  const steps = [
    {
      title: copy.howStepOneTitle,
      description: copy.howStepOneDescription,
    },
    {
      title: copy.howStepTwoTitle,
      description: copy.howStepTwoDescription,
    },
    {
      title: copy.howStepThreeTitle,
      description: copy.howStepThreeDescription,
    },
  ];

  return (
    <section className="py-24 md:py-32" id="how-it-works">
      <div className="section-divider" />
      <div className="section-shell mt-24 md:mt-28">
        <div className="max-w-[40rem]">
          <p className="eyebrow">{copy.howEyebrow}</p>
          <h2 className="section-title mt-5">{copy.howTitle}</h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="card-surface relative overflow-hidden px-7 py-9 md:px-8 md:py-10"
            >
              <div className="absolute inset-0 bg-grain bg-[size:16px_16px] opacity-[0.14]" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky/8 to-transparent" />
              <div className="relative">
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.3em] text-sky">
                  0{index + 1}
                </p>
                <h3 className="mt-6 font-serif text-[1.9rem] leading-tight text-bark">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-[16rem] text-[1rem] leading-7 text-bark/72">
                  {step.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
