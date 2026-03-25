export function Hero() {
  return (
    <section
      className="relative flex min-h-screen items-end overflow-hidden"
      aria-label="Hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/mountain1.jpg')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,16,16,0.82)_0%,rgba(16,16,16,0.58)_42%,rgba(16,16,16,0.22)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(142,185,200,0.2),transparent_28%)]" />

      <div className="section-shell relative z-10 flex w-full py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="mb-5 text-xs uppercase tracking-[0.34em] text-sky/80">
            Mountain village eggs
          </p>
          <h1 className="max-w-xl font-serif text-5xl leading-[0.95] text-white md:text-7xl">
            Eggs from the mountains. Naturally limited.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/78 md:text-xl">
            Free-roaming chickens. No mass production. Only what nature
            provides.
          </p>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a
              href="#notify"
              className="rounded-full bg-sky px-7 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-bark transition hover:bg-[#a7cad6]"
            >
              Get notified
            </a>
            <p className="text-sm uppercase tracking-[0.18em] text-white/65">
              Available in small batches only.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
