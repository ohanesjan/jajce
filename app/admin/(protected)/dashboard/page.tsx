import { saveHomepagePublicNoteSettingAction } from "@/app/admin/actions";
import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy, formatAdminValueLabel } from "@/lib/admin-localization";
import { getAdminDashboardData } from "@/lib/services/admin-dashboard";
import { getHomepagePublicNoteEnabled } from "@/lib/services/site-settings";
import { formatDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminDashboardPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? ({} as SearchParamsRecord);
  const language = await getAdminLanguage();
  const copy = getAdminCopy(language);
  const mode = readSearchParam(resolvedSearchParams.mode);
  const settingsSuccessCode = readSearchParam(resolvedSearchParams.settingsSuccess);
  const settingsErrorCode = readSearchParam(resolvedSearchParams.settingsError);
  const [dashboard, homepagePublicNoteEnabled] = await Promise.all([
    getAdminDashboardData({ mode }),
    getHomepagePublicNoteEnabled(),
  ]);

  return (
    <main className="space-y-6">
      <section className="card-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{copy.dashboard.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {copy.dashboard.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/75">
              {copy.dashboard.description}
            </p>
            <p className="mt-2 text-sm text-bark/60">
              {copy.dashboard.localDate}: {formatDateOnly(dashboard.date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ModeLink
              href="/admin/dashboard?mode=simple"
              label={copy.dashboard.simple}
              active={dashboard.mode === "simple"}
            />
            <ModeLink
              href="/admin/dashboard?mode=expanded"
              label={copy.dashboard.expanded}
              active={dashboard.mode === "expanded"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label={copy.dashboard.availableEggs}
          value={formatMetricValue(dashboard.simple.available_eggs)}
          detail={copy.dashboard.availableEggsDetail}
        />
        <DashboardCard
          label={copy.dashboard.todayTotalYield}
          value={formatMetricValue(dashboard.simple.today_total_yield)}
          detail={copy.dashboard.todayTotalYieldDetail}
        />
        <DashboardCard
          label={copy.dashboard.todayCollectedForSale}
          value={formatMetricValue(dashboard.simple.today_collected_for_sale)}
          detail={copy.dashboard.todayCollectedForSaleDetail}
        />
        <DashboardCard
          label={copy.dashboard.yesterdayCollectedForSale}
          value={formatMetricValue(dashboard.simple.yesterday_collected_for_sale)}
          detail={copy.dashboard.yesterdayCollectedForSaleDetail}
        />
        <DashboardCard
          label={copy.dashboard.latestChickenCount}
          value={formatMetricValue(dashboard.simple.latest_chicken_count)}
          detail={
            dashboard.simple.latest_chicken_count_date
              ? `${copy.dashboard.latestLog}: ${formatDateOnly(dashboard.simple.latest_chicken_count_date)}`
              : copy.dashboard.noDailyLogsYet
          }
        />
        <DashboardCard
          label={copy.dashboard.todaySoldEggs}
          value={formatMetricValue(dashboard.simple.today_sold_eggs)}
          detail={copy.dashboard.todaySoldEggsDetail}
        />
        <DashboardCard
          label={copy.dashboard.todayRevenue}
          value={formatMetricValue(dashboard.simple.today_revenue)}
          detail={copy.dashboard.todayRevenueDetail}
        />
        <DashboardCard
          label={copy.dashboard.todayTotalCost}
          value={formatMetricValue(dashboard.simple.today_total_cost)}
          detail={copy.dashboard.todayTotalCostDetail}
        />
        <DashboardCard
          label={copy.dashboard.todayGrossMargin}
          value={formatMetricValue(dashboard.simple.today_gross_margin)}
          detail={copy.dashboard.todayGrossMarginDetail}
        />
        <DashboardCard
          label={copy.dashboard.subscriberCount}
          value={formatMetricValue(dashboard.simple.subscriber_count)}
          detail={copy.dashboard.subscriberCountDetail}
        />
        <DashboardCard
          label={copy.dashboard.waitingListCount}
          value={formatMetricValue(dashboard.simple.waiting_list_count)}
          detail={copy.dashboard.waitingListCountDetail}
        />
        <DashboardCard
          label={copy.dashboard.activeCustomerCount}
          value={formatMetricValue(dashboard.simple.active_customer_count)}
          detail={copy.dashboard.activeCustomerCountDetail}
        />
      </section>

      <section className="card-surface p-6">
        <p className="eyebrow">{copy.dashboard.homepageEyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {copy.dashboard.homepageTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/75">
          {copy.dashboard.homepageDescription}
        </p>

        {settingsSuccessCode ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {copy.dashboard.homepageSettingSaved}
          </div>
        ) : null}

        {settingsErrorCode ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {settingsErrorCode === "validation"
              ? copy.dashboard.homepageSettingValidationError
              : copy.dashboard.homepageSettingUnknownError}
          </div>
        ) : null}

        <form action={saveHomepagePublicNoteSettingAction} className="mt-6">
          <input type="hidden" name="mode" value={dashboard.mode} />

          <label className="flex items-start gap-3 rounded-2xl border border-soil/20 bg-white/50 px-4 py-4 text-sm text-bark">
            <input
              type="checkbox"
              name="homepage_public_note_enabled"
              defaultChecked={homepagePublicNoteEnabled}
              className="mt-1 h-4 w-4 rounded border-soil/30 text-bark focus:ring-bark/20"
            />
            <span>
              {copy.dashboard.homepageCheckbox}
            </span>
          </label>

          <p className="mt-3 text-sm leading-6 text-bark/70">
            {copy.dashboard.homepageHelper}
          </p>

          <div className="mt-4">
            <button
              type="submit"
              className="rounded-2xl bg-bark px-5 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
            >
              {copy.dashboard.saveHomepageSetting}
            </button>
          </div>
        </form>
      </section>

      {dashboard.expanded ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardCard
              label={copy.dashboard.totalYieldPerChicken}
              value={formatMetricValue(dashboard.expanded.total_yield_per_chicken)}
              detail={copy.dashboard.totalYieldPerChickenDetail}
            />
            <DashboardCard
              label={copy.dashboard.saleYieldPerChicken}
              value={formatMetricValue(dashboard.expanded.sale_yield_per_chicken)}
              detail={copy.dashboard.saleYieldPerChickenDetail}
            />
            <DashboardCard
              label={copy.dashboard.todayDirectCost}
              value={formatMetricValue(dashboard.expanded.today_direct_cost)}
              detail={copy.dashboard.todayDirectCostDetail}
            />
            <DashboardCard
              label={copy.dashboard.todayAllocatedCost}
              value={formatMetricValue(dashboard.expanded.today_allocated_cost)}
              detail={copy.dashboard.todayAllocatedCostDetail}
            />
            <DashboardCard
              label={copy.dashboard.grossMargin7d}
              value={formatMetricValue(dashboard.expanded.gross_margin_7d)}
              detail={copy.dashboard.grossMargin7dDetail}
            />
            <DashboardCard
              label={copy.dashboard.grossMargin30d}
              value={formatMetricValue(dashboard.expanded.gross_margin_30d)}
              detail={copy.dashboard.grossMargin30dDetail}
            />
          </section>

          <section className="card-surface p-6">
            <p className="eyebrow">{copy.dashboard.todayEyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {copy.dashboard.costByCategoryTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-bark/75">
              {copy.dashboard.costByCategoryDescription}
            </p>

            {dashboard.expanded.cost_by_category.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-soil/20 px-4 py-5 text-sm text-bark/70">
                {copy.dashboard.noBookedCostsToday}
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-bark/55">
                      <th className="px-4">{copy.dashboard.category}</th>
                      <th className="px-4">{copy.dashboard.totalAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.expanded.cost_by_category.map((row) => (
                      <tr key={row.category} className="rounded-2xl bg-white/50">
                        <td className="rounded-l-2xl px-4 py-3 text-sm text-bark">
                          {formatAdminValueLabel(row.category, language)}
                        </td>
                        <td className="rounded-r-2xl px-4 py-3 text-sm font-medium text-bark">
                          {formatMetricValue(row.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function DashboardCard({
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

function ModeLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-bark px-4 py-2 text-sm font-medium text-parchment"
          : "rounded-full border border-soil/20 px-4 py-2 text-sm text-bark transition hover:border-soil/40"
      }
    >
      {label}
    </a>
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
    return "--";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
