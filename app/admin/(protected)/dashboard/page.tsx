import { getAdminDashboardMetrics } from "@/lib/services/admin-dashboard";
import { formatDateOnly } from "@/lib/utils/date";

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();

  return (
    <main className="space-y-6">
      <section className="card-surface p-6">
        <p className="eyebrow">Phase 2</p>
        <h2 className="mt-2 font-serif text-3xl text-bark">Overview</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-bark/75">
          These cards are intentionally limited to the Phase 2 dashboard scope.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardCard
          label="Available eggs"
          value={metrics.available_eggs}
          detail="Sellable stock from the inventory ledger."
        />
        <DashboardCard
          label="Today total yield"
          value={metrics.today_total_yield}
          detail="Auto-calculated from today&apos;s daily log."
        />
        <DashboardCard
          label="Today collected for sale"
          value={metrics.today_collected_for_sale}
          detail="Only this quantity enters inventory."
        />
        <DashboardCard
          label="Yesterday collected for sale"
          value={metrics.yesterday_collected_for_sale}
          detail="Yesterday&apos;s sellable collection."
        />
        <DashboardCard
          label="Latest chicken count"
          value={metrics.latest_chicken_count}
          detail={
            metrics.latest_chicken_count_date
              ? `Latest log: ${formatDateOnly(metrics.latest_chicken_count_date)}`
              : "No daily logs yet."
          }
        />
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
  value: number;
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
