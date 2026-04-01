import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAdminAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/services/admin-session";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="card-surface flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Jajce Admin</p>
            <h1 className="mt-2 font-serif text-2xl text-bark">
              Admin dashboard
            </h1>
            <p className="mt-1 text-sm text-bark/70">{session.admin.email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/daily-logs"
              className="rounded-full border border-soil/20 px-4 py-2 text-bark transition hover:border-soil/40"
            >
              Daily logs
            </Link>
            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="rounded-full bg-bark px-4 py-2 text-parchment transition hover:bg-bark/90"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}
