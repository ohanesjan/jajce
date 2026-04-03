import { getAdminDashboardData } from "@/lib/services/admin-dashboard";
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
  const mode = readSearchParam(resolvedSearchParams.mode);
  const dashboard = await getAdminDashboardData({ mode });

  return (
    <main className="space-y-6">
      <section className="card-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Phase 5</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">Dashboard</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/75">
              Read-only admin KPIs computed server-side from inventory, daily
              logs, orders, booked costs, and contact role flags.
            </p>
            <p className="mt-2 text-sm text-bark/60">
              Local admin date: {formatDateOnly(dashboard.date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ModeLink
              href="/admin/dashboard?mode=simple"
              label="Simple"
              active={dashboard.mode === "simple"}
            />
            <ModeLink
              href="/admin/dashboard?mode=expanded"
              label="Expanded"
              active={dashboard.mode === "expanded"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Available eggs"
          value={formatMetricValue(dashboard.simple.available_eggs)}
          detail="Sellable stock from the inventory ledger."
        />
        <DashboardCard
          label="Today total yield"
          value={formatMetricValue(dashboard.simple.today_total_yield)}
          detail="Today's daily log total yield."
        />
        <DashboardCard
          label="Today collected for sale"
          value={formatMetricValue(dashboard.simple.today_collected_for_sale)}
          detail="Today's sellable collection from the daily log."
        />
        <DashboardCard
          label="Yesterday collected for sale"
          value={formatMetricValue(dashboard.simple.yesterday_collected_for_sale)}
          detail="Yesterday's sellable collection from the daily log."
        />
        <DashboardCard
          label="Latest chicken count"
          value={formatMetricValue(dashboard.simple.latest_chicken_count)}
          detail={
            dashboard.simple.latest_chicken_count_date
              ? `Latest log: ${formatDateOnly(dashboard.simple.latest_chicken_count_date)}`
              : "No daily logs yet."
          }
        />
        <DashboardCard
          label="Today sold eggs"
          value={formatMetricValue(dashboard.simple.today_sold_eggs)}
          detail="Completed-order quantity recognized today."
        />
        <DashboardCard
          label="Today revenue"
          value={formatMetricValue(dashboard.simple.today_revenue)}
          detail="Completed-order revenue recognized today."
        />
        <DashboardCard
          label="Today total cost"
          value={formatMetricValue(dashboard.simple.today_total_cost)}
          detail="Today's direct plus allocated booked costs."
        />
        <DashboardCard
          label="Today gross margin"
          value={formatMetricValue(dashboard.simple.today_gross_margin)}
          detail="Today's revenue minus total cost."
        />
        <DashboardCard
          label="Subscriber count"
          value={formatMetricValue(dashboard.simple.subscriber_count)}
          detail="Contacts flagged as subscribers."
        />
        <DashboardCard
          label="Waiting list count"
          value={formatMetricValue(dashboard.simple.waiting_list_count)}
          detail="Contacts flagged on the waiting list."
        />
        <DashboardCard
          label="Active customer count"
          value={formatMetricValue(dashboard.simple.active_customer_count)}
          detail="Contacts flagged as active customers."
        />
      </section>

      {dashboard.expanded ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DashboardCard
              label="Total yield per chicken"
              value={formatMetricValue(dashboard.expanded.total_yield_per_chicken)}
              detail="Null when today's chicken count is missing or zero."
            />
            <DashboardCard
              label="Sale yield per chicken"
              value={formatMetricValue(dashboard.expanded.sale_yield_per_chicken)}
              detail="Today's collected-for-sale eggs divided by chicken count."
            />
            <DashboardCard
              label="Today direct cost"
              value={formatMetricValue(dashboard.expanded.today_direct_cost)}
              detail="Today's booked costs marked as direct."
            />
            <DashboardCard
              label="Today allocated cost"
              value={formatMetricValue(dashboard.expanded.today_allocated_cost)}
              detail="Today's booked costs marked as allocated."
            />
            <DashboardCard
              label="7-day gross margin"
              value={formatMetricValue(dashboard.expanded.gross_margin_7d)}
              detail="Rolling gross margin across the last 7 local dates."
            />
            <DashboardCard
              label="30-day gross margin"
              value={formatMetricValue(dashboard.expanded.gross_margin_30d)}
              detail="Rolling gross margin across the last 30 local dates."
            />
          </section>

          <section className="card-surface p-6">
            <p className="eyebrow">Today</p>
            <h2 className="mt-2 font-serif text-3xl text-bark">
              Cost by category
            </h2>
            <p className="mt-3 text-sm leading-6 text-bark/75">
              Booked costs for today grouped by category.
            </p>

            {dashboard.expanded.cost_by_category.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-soil/20 px-4 py-5 text-sm text-bark/70">
                No booked costs for today.
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.2em] text-bark/55">
                      <th className="px-4">Category</th>
                      <th className="px-4">Total amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.expanded.cost_by_category.map((row) => (
                      <tr key={row.category} className="rounded-2xl bg-white/50">
                        <td className="rounded-l-2xl px-4 py-3 text-sm text-bark">
                          {formatCategoryLabel(row.category)}
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

function formatCategoryLabel(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
