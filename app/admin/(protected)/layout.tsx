import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAdminAction } from "@/app/admin/actions";
import { AdminLanguageSwitch } from "@/components/admin/AdminLanguageSwitch";
import { getAdminLanguage } from "@/lib/admin-language.server";
import { getAdminCopy } from "@/lib/admin-localization";
import { requireAdminSession } from "@/lib/services/admin-session";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, language] = await Promise.all([
    requireAdminSession(),
    getAdminLanguage(),
  ]);
  const copy = getAdminCopy(language);

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="card-surface px-6 py-5">
          <div className="flex flex-col gap-4 border-b border-soil/10 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="eyebrow">{copy.common.appName}</p>
              <h1 className="mt-2 font-serif text-2xl text-bark">
                {copy.layout.title}
              </h1>
              <p className="mt-1 text-sm text-bark/70">{session.admin.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              <AdminLanguageSwitch
                currentLanguage={language}
                label={copy.common.language}
              />
              <form action={logoutAdminAction}>
                <button
                  type="submit"
                  className="rounded-full bg-bark px-4 py-2 text-sm text-parchment transition hover:bg-bark/90"
                >
                  {copy.layout.logout}
                </button>
              </form>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 pt-4 text-sm">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.dashboard}
            </Link>
            <Link
              href="/admin/daily-logs"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.dailyLogs}
            </Link>
            <Link
              href="/admin/costs"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.costs}
            </Link>
            <Link
              href="/admin/contacts"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.contacts}
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.orders}
            </Link>
            <Link
              href="/admin/notifications"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.notifications}
            </Link>
            <Link
              href="/admin/margin"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              {copy.layout.margin}
            </Link>
          </nav>
        </header>

        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}
