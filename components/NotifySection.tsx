"use client";

export function NotifySection() {
  return (
    <section className="section-shell py-20 md:py-28" id="notify">
      <div className="card-surface relative overflow-hidden px-6 py-10 md:px-12 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(142,185,200,0.18),transparent_42%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="eyebrow">Availability updates</p>
          <h2 className="section-title mt-4">
            Be the first to hear when a batch is ready
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-bark/75 md:text-lg">
            Leave your email or phone number and we will only reach out when
            eggs are available.
          </p>

          <form
            className="mt-10 flex flex-col gap-4 sm:flex-row"
            onSubmit={(event) => event.preventDefault()}
          >
            <label className="sr-only" htmlFor="contact">
              Email or phone number
            </label>
            <input
              id="contact"
              name="contact"
              type="text"
              placeholder="Email or phone number"
              className="min-h-14 flex-1 rounded-full border border-soil/15 bg-white/90 px-6 text-base text-bark placeholder:text-bark/40 focus:border-sky focus:outline-none focus:ring-2 focus:ring-sky/30"
            />
            <button
              type="submit"
              className="min-h-14 rounded-full bg-bark px-8 text-sm font-semibold uppercase tracking-[0.22em] text-parchment transition hover:bg-[#4b3f37]"
            >
              Notify me
            </button>
          </form>

          <p className="mt-4 text-sm text-bark/60">
            Only messages when eggs are available.
          </p>
        </div>
      </div>
    </section>
  );
}
