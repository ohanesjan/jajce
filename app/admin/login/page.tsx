import { redirect } from "next/navigation";
import { loginAdminAction } from "@/app/admin/actions";
import { getAdminLanguage } from "@/lib/admin-language";
import { getAdminCopy } from "@/lib/admin-localization";
import { getAdminLoginRedirectPath } from "@/lib/services/admin-auth";
import { getAdminSession } from "@/lib/services/admin-session";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type LoginPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps) {
  const [session, resolvedSearchParams, language] = await Promise.all([
    getAdminSession(),
    searchParams ?? Promise.resolve({} as SearchParamsRecord),
    getAdminLanguage(),
  ]);
  const copy = getAdminCopy(language);
  const redirectPath = getAdminLoginRedirectPath(
    session
      ? { id: session.admin.id, email: session.admin.email, last_login_at: null }
      : null,
  );

  if (redirectPath) {
    redirect(redirectPath);
  }

  const errorCode = readSearchParam(resolvedSearchParams.error);
  const nextPath = readSearchParam(resolvedSearchParams.next);
  const loginErrorMessages: Record<string, string> = {
    ...copy.login.errors,
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="card-surface w-full p-8">
          <p className="eyebrow">{copy.login.eyebrow}</p>
          <h1 className="mt-3 font-serif text-3xl text-bark">
            {copy.login.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-bark/75">
            {copy.login.description}
          </p>

          {errorCode ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loginErrorMessages[errorCode] ?? copy.login.errors.unknown}
            </div>
          ) : null}

          <form action={loginAdminAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={nextPath ?? ""} />

            <label className="block text-sm text-bark">
              <span className="mb-1 block font-medium">
                {copy.login.email}
              </span>
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </label>

            <label className="block text-sm text-bark">
              <span className="mb-1 block font-medium">
                {copy.login.password}
              </span>
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-soil/20 bg-white/90 px-4 py-3 outline-none transition focus:border-soil/50"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-bark px-4 py-3 text-sm font-medium text-parchment transition hover:bg-bark/90"
            >
              {copy.login.signIn}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}
