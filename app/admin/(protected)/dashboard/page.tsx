import {
  saveHomepageStatOverridesAction,
} from "@/app/admin/actions";
import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy, formatAdminValueLabel } from "@/lib/admin-localization";
import { getAdminDashboardData } from "@/lib/services/admin-dashboard";
import {
  getHomepagePublicNoteEnabled,
  getHomepageStatOverrides,
} from "@/lib/services/site-settings";
import { formatDateOnly } from "@/lib/utils/date";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type AdminDashboardPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

type DashboardMetricCard = {
  label: string;
  value: string;
  detail: string;
};

type DashboardMetricSection = {
  title: string;
  columnsClassName: string;
  cards: DashboardMetricCard[];
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const resolvedSearchParams =
    (await searchParams) ?? ({} as SearchParamsRecord);
  const language = await getAdminLanguage();
  const copy = getAdminCopy(language);
  const mode = readSearchParam(resolvedSearchParams.mode);
  const displayOverridesSuccessCode = readSearchParam(
    resolvedSearchParams.displayOverridesSuccess,
  );
  const displayOverridesErrorCode = readSearchParam(
    resolvedSearchParams.displayOverridesError,
  );
  const [dashboard, homepagePublicNoteEnabled, homepageStatOverrides] =
    await Promise.all([
    getAdminDashboardData({ mode }),
    getHomepagePublicNoteEnabled(),
    getHomepageStatOverrides(),
  ]);
  const simpleMetricCards: DashboardMetricCard[] = [
    {
      label: copy.dashboard.availableEggs,
      value: formatMetricValue(dashboard.simple.available_eggs),
      detail: copy.dashboard.availableEggsDetail,
    },
    {
      label: copy.dashboard.todayCollectedForSale,
      value: formatMetricValue(dashboard.simple.today_collected_for_sale),
      detail: copy.dashboard.todayCollectedForSaleDetail,
    },
    {
      label: copy.dashboard.yesterdayCollectedForSale,
      value: formatMetricValue(dashboard.simple.yesterday_collected_for_sale),
      detail: copy.dashboard.yesterdayCollectedForSaleDetail,
    },
    {
      label: copy.dashboard.latestChickenCount,
      value: formatMetricValue(dashboard.simple.latest_chicken_count),
      detail: dashboard.simple.latest_chicken_count_date
        ? `${copy.dashboard.latestLog}: ${formatDateOnly(dashboard.simple.latest_chicken_count_date)}`
        : copy.dashboard.noDailyLogsYet,
    },
    {
      label: copy.dashboard.todaySoldEggs,
      value: formatMetricValue(dashboard.simple.today_sold_eggs),
      detail: copy.dashboard.todaySoldEggsDetail,
    },
    {
      label: copy.dashboard.todayRevenue,
      value: formatMetricValue(dashboard.simple.today_revenue),
      detail: copy.dashboard.todayRevenueDetail,
    },
    {
      label: copy.dashboard.todayTotalCost,
      value: formatMetricValue(dashboard.simple.today_total_cost),
      detail: copy.dashboard.todayTotalCostDetail,
    },
    {
      label: copy.dashboard.todayGrossMargin,
      value: formatMetricValue(dashboard.simple.today_gross_margin),
      detail: copy.dashboard.todayGrossMarginDetail,
    },
  ];
  const expandedMetricSections: DashboardMetricSection[] = dashboard.expanded
    ? [
        {
          title: copy.dashboard.productionAndFlockSection,
          columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
          cards: [
            {
              label: copy.dashboard.todayTotalYield,
              value: formatMetricValue(dashboard.simple.today_total_yield),
              detail: copy.dashboard.todayTotalYieldDetail,
            },
            {
              label: copy.dashboard.totalYieldPerChicken,
              value: formatMetricValue(dashboard.expanded.total_yield_per_chicken),
              detail: copy.dashboard.totalYieldPerChickenDetail,
            },
            {
              label: copy.dashboard.saleYieldPerChicken,
              value: formatMetricValue(dashboard.expanded.sale_yield_per_chicken),
              detail: copy.dashboard.saleYieldPerChickenDetail,
            },
          ],
        },
        {
          title: copy.dashboard.customersSection,
          columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
          cards: [
            {
              label: copy.dashboard.subscriberCount,
              value: formatMetricValue(dashboard.simple.subscriber_count),
              detail: copy.dashboard.subscriberCountDetail,
            },
            {
              label: copy.dashboard.waitingListCount,
              value: formatMetricValue(dashboard.simple.waiting_list_count),
              detail: copy.dashboard.waitingListCountDetail,
            },
            {
              label: copy.dashboard.activeCustomerCount,
              value: formatMetricValue(dashboard.simple.active_customer_count),
              detail: copy.dashboard.activeCustomerCountDetail,
            },
          ],
        },
        {
          title: copy.dashboard.financeSection,
          columnsClassName: "md:grid-cols-2 xl:grid-cols-4",
          cards: [
            {
              label: copy.dashboard.todayDirectCost,
              value: formatMetricValue(dashboard.expanded.today_direct_cost),
              detail: copy.dashboard.todayDirectCostDetail,
            },
            {
              label: copy.dashboard.todayAllocatedCost,
              value: formatMetricValue(dashboard.expanded.today_allocated_cost),
              detail: copy.dashboard.todayAllocatedCostDetail,
            },
            {
              label: copy.dashboard.grossMargin7d,
              value: formatMetricValue(dashboard.expanded.gross_margin_7d),
              detail: copy.dashboard.grossMargin7dDetail,
            },
            {
              label: copy.dashboard.grossMargin30d,
              value: formatMetricValue(dashboard.expanded.gross_margin_30d),
              detail: copy.dashboard.grossMargin30dDetail,
            },
          ],
        },
      ]
    : [];

  return (
    <main className="space-y-6">
      <section className="card-surface p-6">
        <div className="admin-section-header">
          <div>
            <p className="eyebrow">{copy.dashboard.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {copy.dashboard.title}
            </h2>
            <p className="admin-section-copy max-w-2xl">
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
        {simpleMetricCards.map((card) => (
          <DashboardCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
          />
        ))}
      </section>

      {dashboard.expanded ? (
        <div className="space-y-6">
          {expandedMetricSections.map((section) => (
            <section key={section.title} className="card-surface p-6">
              <h2 className="font-serif text-2xl text-bark">{section.title}</h2>
              <div className={`mt-5 grid gap-4 ${section.columnsClassName}`}>
                {section.cards.map((card) => (
                  <DashboardCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    detail={card.detail}
                  />
                ))}
              </div>
            </section>
          ))}

          <section className="card-surface p-6">
            <p className="eyebrow">{copy.dashboard.todayEyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              {copy.dashboard.costByCategoryTitle}
            </h2>
            <p className="admin-section-copy mt-3">
              {copy.dashboard.costByCategoryDescription}
            </p>

            {dashboard.expanded.cost_by_category.length === 0 ? (
              <div className="admin-empty-state mt-6">
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

      <section className="card-surface p-6">
        <p className="eyebrow">{copy.dashboard.homepageDisplayEyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">
          {copy.dashboard.homepageDisplayTitle}
        </h2>
        <p className="admin-section-copy max-w-2xl">
          {copy.dashboard.homepageDisplayDescription}
        </p>

        {displayOverridesSuccessCode ? (
          <div className="admin-alert admin-alert-success mt-5">
            {copy.dashboard.homepageDisplaySaved}
          </div>
        ) : null}

        {displayOverridesErrorCode ? (
          <div className="admin-alert admin-alert-error mt-5">
            {displayOverridesErrorCode === "validation"
              ? copy.dashboard.homepageDisplayValidationError
              : copy.dashboard.homepageDisplayUnknownError}
          </div>
        ) : null}

        <form action={saveHomepageStatOverridesAction} className="mt-6">
          <input type="hidden" name="mode" value={dashboard.mode} />

          <div className="space-y-4">
            <label className="admin-subsection-shell flex items-start gap-3 text-sm text-bark">
              <input
                type="checkbox"
                name="homepage_public_note_enabled"
                defaultChecked={homepagePublicNoteEnabled}
                className="mt-1 h-4 w-4 rounded border-soil/30 text-bark focus:ring-bark/20"
              />
              <span>
                <span className="block font-medium">
                  {copy.dashboard.homepageDisplayPublicNoteLabel}
                </span>
                <span className="admin-helper-text block">
                  {copy.dashboard.homepageDisplayPublicNoteHelper}
                </span>
              </span>
            </label>

            <div className="admin-subsection-shell">
              <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
                <input
                  id="manual_counts_enabled"
                  type="checkbox"
                  name="manual_counts_enabled"
                  defaultChecked={homepageStatOverrides.manual_counts_enabled}
                  className="peer mt-1 h-4 w-4 rounded border-soil/30 text-bark focus:ring-bark/20"
                />
                <div>
                  <label
                    htmlFor="manual_counts_enabled"
                    className="block text-sm font-medium text-bark"
                  >
                    {copy.dashboard.homepageDisplayCountsToggleLabel}
                  </label>
                  <p className="admin-helper-text">
                    {copy.dashboard.homepageDisplayCountsToggleHelper}
                  </p>
                </div>

                <div
                  className={`${
                    homepageStatOverrides.manual_counts_enabled ? "grid" : "hidden"
                  } gap-4 md:col-span-2 md:grid-cols-3 peer-checked:grid`}
                >
                  <label className="flex flex-col gap-2 text-sm text-bark">
                    <span>{copy.dashboard.homepageDisplayToday}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      name="today_eggs_collected_for_sale"
                      defaultValue={formatOptionalNumberInput(
                        homepageStatOverrides.today_eggs_collected_for_sale,
                      )}
                      className="rounded-2xl border border-soil/20 bg-white/70 px-4 py-3 text-bark outline-none transition focus:border-bark/30 focus:ring-2 focus:ring-bark/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-bark">
                    <span>{copy.dashboard.homepageDisplayYesterday}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      name="yesterday_eggs_collected_for_sale"
                      defaultValue={formatOptionalNumberInput(
                        homepageStatOverrides.yesterday_eggs_collected_for_sale,
                      )}
                      className="rounded-2xl border border-soil/20 bg-white/70 px-4 py-3 text-bark outline-none transition focus:border-bark/30 focus:ring-2 focus:ring-bark/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-bark">
                    <span>{copy.dashboard.homepageDisplayChickens}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      name="latest_chicken_count"
                      defaultValue={formatOptionalNumberInput(
                        homepageStatOverrides.latest_chicken_count,
                      )}
                      className="rounded-2xl border border-soil/20 bg-white/70 px-4 py-3 text-bark outline-none transition focus:border-bark/30 focus:ring-2 focus:ring-bark/10"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="admin-subsection-shell">
              <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
                <input
                  id="manual_price_enabled"
                  type="checkbox"
                  name="manual_price_enabled"
                  defaultChecked={homepageStatOverrides.manual_price_enabled}
                  className="peer mt-1 h-4 w-4 rounded border-soil/30 text-bark focus:ring-bark/20"
                />
                <div>
                  <label
                    htmlFor="manual_price_enabled"
                    className="block text-sm font-medium text-bark"
                  >
                    {copy.dashboard.homepageDisplayPriceToggleLabel}
                  </label>
                  <p className="admin-helper-text">
                    {copy.dashboard.homepageDisplayPriceToggleHelper}
                  </p>
                </div>

                <div
                  className={`${
                    homepageStatOverrides.manual_price_enabled ? "grid" : "hidden"
                  } gap-4 md:col-span-2 md:grid-cols-1 peer-checked:grid`}
                >
                  <label className="flex max-w-xs flex-col gap-2 text-sm text-bark">
                    <span>{copy.dashboard.homepageDisplayPrice}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      name="public_price"
                      defaultValue={formatOptionalNumberInput(
                        homepageStatOverrides.public_price,
                      )}
                      className="rounded-2xl border border-soil/20 bg-white/70 px-4 py-3 text-bark outline-none transition focus:border-bark/30 focus:ring-2 focus:ring-bark/10"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-action-row mt-6">
            <button
              type="submit"
              className="admin-button admin-button-primary"
            >
              {copy.dashboard.saveHomepageDisplay}
            </button>
          </div>
        </form>
      </section>
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
      <p className="admin-helper-text mt-3">{detail}</p>
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
          ? "admin-button bg-bark px-4 py-2 text-parchment"
          : "admin-button border border-soil/20 px-4 py-2 text-bark hover:border-soil/40"
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

function formatOptionalNumberInput(value: number | null): string {
  return value === null ? "" : String(value);
}
