import Image from "next/image";

export function Story() {
  return (
    <section className="section-shell py-20 md:py-28" id="story">
      <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
        <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] shadow-soft md:min-h-[520px]">
          <Image
            src="/images/chickens.jpg"
            alt="Free-roaming chickens in a mountain village"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="eyebrow">Our story</p>
          <h2 className="section-title mt-4">Raised naturally</h2>
          <p className="section-copy mt-6">
            Our chickens roam freely in a mountain village, with space, fresh
            air, and natural rhythm. We do not force production — we collect
            only what nature provides.
          </p>
          <div className="mt-8 h-px w-24 bg-soil/25" />
          <p className="mt-8 max-w-xl text-sm uppercase tracking-[0.22em] text-soil/70">
            Small-scale. Seasonal. Genuine.
          </p>
        </div>
      </div>
    </section>
  );
}
