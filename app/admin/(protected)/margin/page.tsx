import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy } from "@/lib/admin-localization";
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
  const language = await getAdminLanguage();
  const copy = getAdminCopy(language);
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
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">{copy.margin.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {copy.margin.title}
            </h2>
            <p className="admin-section-copy max-w-2xl">
              {copy.margin.description}
            </p>
          </div>

          <form className="flex flex-wrap items-end gap-3">
            <label className="block text-sm text-bark">
              <span className="mb-1 block font-medium">{copy.margin.date}</span>
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
              className="admin-button admin-button-secondary"
            >
              {copy.margin.loadDate}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={copy.margin.dailyRevenue}
          value={formatMetricValue(insights.daily.revenue)}
          detail={copy.margin.dailyRevenueDetail}
        />
        <MetricCard
          label={copy.margin.dailyDirectCost}
          value={formatMetricValue(insights.daily.direct_cost)}
          detail={copy.margin.dailyDirectCostDetail}
        />
        <MetricCard
          label={copy.margin.dailyAllocatedCost}
          value={formatMetricValue(insights.daily.allocated_cost)}
          detail={copy.margin.dailyAllocatedCostDetail}
        />
        <MetricCard
          label={copy.margin.dailyTotalCost}
          value={formatMetricValue(insights.daily.total_cost)}
          detail={copy.margin.dailyTotalCostDetail}
        />
        <MetricCard
          label={copy.margin.dailyGrossMargin}
          value={formatMetricValue(insights.daily.gross_margin)}
          detail={copy.margin.dailyGrossMarginDetail}
        />
        <MetricCard
          label={copy.margin.dailyDirectMargin}
          value={formatMetricValue(insights.daily.direct_margin)}
          detail={copy.margin.dailyDirectMarginDetail}
        />
        <MetricCard
          label={copy.margin.costPerCollectedEgg}
          value={formatMetricValue(insights.daily.cost_per_collected_egg)}
          detail={copy.margin.costPerCollectedEggDetail}
        />
        <MetricCard
          label={copy.margin.marginPerSoldEgg}
          value={formatMetricValue(insights.daily.margin_per_sold_egg)}
          detail={copy.margin.marginPerSoldEggDetail}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SummaryCard
          copy={copy.margin}
          title={copy.margin.summary7d}
          summary={insights.summary_7d}
        />
        <SummaryCard
          copy={copy.margin}
          title={copy.margin.summary30d}
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
      <p className="admin-helper-text mt-3">{detail}</p>
    </article>
  );
}

function SummaryCard({
  copy,
  title,
  summary,
}: {
  copy: ReturnType<typeof getAdminCopy>["margin"];
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
      <p className="eyebrow">{copy.rollingWindow}</p>
      <h2 className="mt-2 font-serif text-3xl text-bark">{title}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SummaryRow label={copy.eggsTotalYield} value={summary.eggs_total_yield} />
        <SummaryRow
          label={copy.eggsCollectedForSale}
          value={summary.eggs_collected_for_sale}
        />
        <SummaryRow label={copy.eggsSold} value={summary.eggs_sold} />
        <SummaryRow label={copy.revenue} value={formatMetricValue(summary.revenue)} />
        <SummaryRow
          label={copy.directCost}
          value={formatMetricValue(summary.direct_cost)}
        />
        <SummaryRow
          label={copy.allocatedCost}
          value={formatMetricValue(summary.allocated_cost)}
        />
        <SummaryRow
          label={copy.totalCost}
          value={formatMetricValue(summary.total_cost)}
        />
        <SummaryRow
          label={copy.grossMargin}
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
