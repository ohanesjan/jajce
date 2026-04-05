import { adminCopy } from "@/lib/admin-localization";
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
            <p className="eyebrow">{adminCopy.margin.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {adminCopy.margin.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/75">
              {adminCopy.margin.description}
            </p>
          </div>

          <form className="flex flex-wrap items-end gap-3">
            <label className="block text-sm text-bark">
              <span className="mb-1 block font-medium">{adminCopy.margin.date}</span>
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
              {adminCopy.margin.loadDate}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={adminCopy.margin.dailyRevenue}
          value={formatMetricValue(insights.daily.revenue)}
          detail={adminCopy.margin.dailyRevenueDetail}
        />
        <MetricCard
          label={adminCopy.margin.dailyDirectCost}
          value={formatMetricValue(insights.daily.direct_cost)}
          detail={adminCopy.margin.dailyDirectCostDetail}
        />
        <MetricCard
          label={adminCopy.margin.dailyAllocatedCost}
          value={formatMetricValue(insights.daily.allocated_cost)}
          detail={adminCopy.margin.dailyAllocatedCostDetail}
        />
        <MetricCard
          label={adminCopy.margin.dailyTotalCost}
          value={formatMetricValue(insights.daily.total_cost)}
          detail={adminCopy.margin.dailyTotalCostDetail}
        />
        <MetricCard
          label={adminCopy.margin.dailyGrossMargin}
          value={formatMetricValue(insights.daily.gross_margin)}
          detail={adminCopy.margin.dailyGrossMarginDetail}
        />
        <MetricCard
          label={adminCopy.margin.dailyDirectMargin}
          value={formatMetricValue(insights.daily.direct_margin)}
          detail={adminCopy.margin.dailyDirectMarginDetail}
        />
        <MetricCard
          label={adminCopy.margin.costPerCollectedEgg}
          value={formatMetricValue(insights.daily.cost_per_collected_egg)}
          detail={adminCopy.margin.costPerCollectedEggDetail}
        />
        <MetricCard
          label={adminCopy.margin.marginPerSoldEgg}
          value={formatMetricValue(insights.daily.margin_per_sold_egg)}
          detail={adminCopy.margin.marginPerSoldEggDetail}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SummaryCard
          title={adminCopy.margin.summary7d}
          summary={insights.summary_7d}
        />
        <SummaryCard
          title={adminCopy.margin.summary30d}
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
      <p className="eyebrow">{adminCopy.margin.rollingWindow}</p>
      <h2 className="mt-2 font-serif text-3xl text-bark">{title}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SummaryRow label={adminCopy.margin.eggsTotalYield} value={summary.eggs_total_yield} />
        <SummaryRow
          label={adminCopy.margin.eggsCollectedForSale}
          value={summary.eggs_collected_for_sale}
        />
        <SummaryRow label={adminCopy.margin.eggsSold} value={summary.eggs_sold} />
        <SummaryRow label={adminCopy.margin.revenue} value={formatMetricValue(summary.revenue)} />
        <SummaryRow
          label={adminCopy.margin.directCost}
          value={formatMetricValue(summary.direct_cost)}
        />
        <SummaryRow
          label={adminCopy.margin.allocatedCost}
          value={formatMetricValue(summary.allocated_cost)}
        />
        <SummaryRow
          label={adminCopy.margin.totalCost}
          value={formatMetricValue(summary.total_cost)}
        />
        <SummaryRow
          label={adminCopy.margin.grossMargin}
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
