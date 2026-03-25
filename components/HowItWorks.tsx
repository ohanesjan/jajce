const steps = [
  {
    title: "We collect eggs",
    description: "Fresh eggs are collected in small daily quantities.",
  },
  {
    title: "You get notified",
    description: "When eggs are available, subscribers are informed.",
  },
  {
    title: "You reserve",
    description: "First come, first served.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-shell py-20 md:py-28" id="how-it-works">
      <div className="max-w-2xl">
        <p className="eyebrow">How it works</p>
        <h2 className="section-title mt-4">A simple rhythm, shaped by nature</h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="card-surface relative overflow-hidden px-7 py-8"
          >
            <div className="absolute inset-0 bg-grain bg-[size:14px_14px] opacity-20" />
            <div className="relative">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky">
                0{index + 1}
              </p>
              <h3 className="mt-5 font-serif text-2xl text-bark">
                {step.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-bark/72">
                {step.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
