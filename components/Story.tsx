"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function Story() {
  const { language } = useLanguage();
  const copy = translations[language];

  return (
    <section className="section-shell py-24 md:py-32" id="story">
      <div className="grid items-center gap-12 md:grid-cols-[1.08fr_0.92fr] md:gap-20">
        <div className="image-frame relative min-h-[360px] md:min-h-[620px]">
          <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,transparent_0%,rgba(28,23,19,0.08)_100%)]" />
          <Image
            src="/images/chickens.jpg"
            alt="Free-roaming chickens in a mountain village"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute bottom-5 left-5 z-20 rounded-full border border-white/35 bg-black/22 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-sm">
            {copy.storyBadge}
          </div>
        </div>
        <div className="md:pr-4">
          <p className="eyebrow">{copy.storyEyebrow}</p>
          <h2 className="section-title mt-5">{copy.storyTitle}</h2>
          <p className="section-copy mt-8">
            {copy.storyParagraphOne}
          </p>
          <p className="section-copy mt-4">{copy.storyParagraphTwo}</p>
          <p className="section-copy mt-4">{copy.storyParagraphThree}</p>
          <div className="mt-10 flex items-center gap-4">
            <div className="h-px w-16 bg-soil/30" />
            <div className="h-px w-8 bg-sky/45" />
          </div>
          <p className="mt-8 max-w-xl text-[0.76rem] font-semibold uppercase tracking-[0.28em] text-soil/72">
            {copy.storyMeta}
          </p>
        </div>
      </div>
    </section>
  );
}
