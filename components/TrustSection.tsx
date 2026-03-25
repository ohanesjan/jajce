"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export function TrustSection() {
  const { language } = useLanguage();
  const copy = translations[language];

  return (
    <section className="section-shell pb-24 md:pb-32">
      <div className="image-frame relative rounded-[2.2rem]">
        <Image
          src="/images/landscape2.jpg"
          alt="Mountain landscape near the village"
          width={1600}
          height={900}
          className="h-[380px] w-full object-cover md:h-[500px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,20,20,0.72)_0%,rgba(20,20,20,0.42)_48%,rgba(20,20,20,0.22)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_35%,rgba(0,0,0,0.08)_100%)]" />
        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="max-w-[44rem] px-8 py-10 md:px-14">
            <p className="font-serif text-[2.4rem] leading-[1.02] text-white md:text-[4.2rem]">
              <span className="block">{copy.trustLineOne}</span>
              <span className="block">{copy.trustLineTwo}</span>
              <span className="block">{copy.trustLineThree}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
