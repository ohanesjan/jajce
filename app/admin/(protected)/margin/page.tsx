import { getMarginInsights } from "@/lib/services/margin-insights";
import { getDateOnlyInTimeZone } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type MarginPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const ADMIN_MARGIN_TIME_ZONE =
  process.env.ADMIN_DASHBOARD_TIME_ZONE ?? "Europe/Amsterdam";

export default async function AdminMarginPage({
  searchParams,
}: MarginPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? ({} as SearchParamsRecord);
  const dateParam =
    readSearchParam(resolvedSearchParams.date) ??
    getDateOnlyInTimeZone(new Date(), ADMIN_MARGIN_TIME_ZONE);
  const referenceDate = new Date(`${dateParam}T12:00:00.000Z`);
  const insights = await getMarginInsights({
    referenceDate,
    timeZone: ADMIN_MARGIN_TIME_ZONE,
  });

  return (
    <main className="space-y-6">
      <section className="card-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Phase 3</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">Margin insights</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/75">
              Margin calculations are computed in backend services from booked
              costs, completed-order revenue, and daily production data.
            </p>
          </div>

          <form className="flex flex-wrap items-end gap-3">
            <label className="block text-sm text-bark">
              <span className="mb-1 block font-medium">Date</span>
              <input
                required
                type="date"
                name="date"
                defaultValue={dateParam}
                className="rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </label>
            <button
              type="submit"
              className="rounded-2xl border border-soil/20 px-5 py-3 text-sm text-bark transition hover:border-soil/40"
            >
              Load date
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Daily revenue"
          value={formatMetricValue(insights.daily.revenue)}
          detail="Completed orders recognized on the selected date."
        />
        <MetricCard
          label="Daily direct cost"
          value={formatMetricValue(insights.daily.direct_cost)}
          detail="Booked costs marked as direct."
        />
        <MetricCard
          label="Daily allocated cost"
          value={formatMetricValue(insights.daily.allocated_cost)}
          detail="Booked costs marked as allocated."
        />
        <MetricCard
          label="Daily total cost"
          value={formatMetricValue(insights.daily.total_cost)}
          detail="Direct plus allocated booked costs."
        />
        <MetricCard
          label="Daily gross margin"
          value={formatMetricValue(insights.daily.gross_margin)}
          detail="Revenue minus total cost."
        />
        <MetricCard
          label="Daily direct margin"
          value={formatMetricValue(insights.daily.direct_margin)}
          detail="Revenue minus direct cost."
        />
        <MetricCard
          label="Cost per collected egg"
          value={formatMetricValue(insights.daily.cost_per_collected_egg)}
          detail="Null when no eggs were collected for sale."
        />
        <MetricCard
          label="Margin per sold egg"
          value={formatMetricValue(insights.daily.margin_per_sold_egg)}
          detail="Null when no eggs were sold."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SummaryCard
          title="7-day summary"
          summary={insights.summary_7d}
        />
        <SummaryCard
          title="30-day summary"
          summary={insights.summary_30d}
        />
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="card-surface p-5">
      <p className="text-sm text-bark/70">{label}</p>
      <p className="mt-3 font-serif text-4xl text-bark">{value}</p>
      <p className="mt-3 text-sm leading-6 text-bark/70">{detail}</p>
    </article>
  );
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: {
    eggs_total_yield: number;
    eggs_collected_for_sale: number;
    eggs_sold: number;
    revenue: number;
    direct_cost: number;
    allocated_cost: number;
    total_cost: number;
    gross_margin: number;
  };
}) {
  return (
    <section className="card-surface p-6">
      <p className="eyebrow">Rolling window</p>
      <h2 className="mt-2 font-serif text-3xl text-bark">{title}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SummaryRow label="Eggs total yield" value={summary.eggs_total_yield} />
        <SummaryRow
          label="Eggs collected for sale"
          value={summary.eggs_collected_for_sale}
        />
        <SummaryRow label="Eggs sold" value={summary.eggs_sold} />
        <SummaryRow label="Revenue" value={formatMetricValue(summary.revenue)} />
        <SummaryRow
          label="Direct cost"
          value={formatMetricValue(summary.direct_cost)}
        />
        <SummaryRow
          label="Allocated cost"
          value={formatMetricValue(summary.allocated_cost)}
        />
        <SummaryRow
          label="Total cost"
          value={formatMetricValue(summary.total_cost)}
        />
        <SummaryRow
          label="Gross margin"
          value={formatMetricValue(summary.gross_margin)}
        />
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-soil/15 bg-white/50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-bark/55">{label}</p>
      <p className="mt-2 text-lg font-medium text-bark">{value}</p>
    </div>
  );
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function formatMetricValue(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
