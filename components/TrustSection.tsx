import Image from "next/image";

export function TrustSection() {
  return (
    <section className="section-shell pb-20 md:pb-28">
      <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
        <Image
          src="/images/landscape2.jpg"
          alt="Mountain landscape near the village"
          width={1600}
          height={900}
          className="h-[340px] w-full object-cover md:h-[440px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,24,24,0.68)_0%,rgba(24,24,24,0.28)_100%)]" />
        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="max-w-2xl px-8 py-10 md:px-14">
            <p className="eyebrow text-sky/85">Place and quality</p>
            <p className="mt-4 font-serif text-3xl leading-tight text-white md:text-5xl">
              From a small mountain village where quality comes before quantity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
