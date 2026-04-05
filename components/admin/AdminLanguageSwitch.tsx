"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setAdminLanguageAction } from "@/app/admin/actions";
import type { AdminLanguage } from "@/lib/admin-language";

type AdminLanguageSwitchProps = {
  currentLanguage: AdminLanguage;
  label: string;
};

const BASE_BUTTON_CLASS_NAME =
  "text-bark/70 transition hover:text-bark focus-visible:outline-none focus-visible:text-bark";
const ACTIVE_BUTTON_CLASS_NAME =
  "font-semibold text-bark underline underline-offset-4";

export function AdminLanguageSwitch({
  currentLanguage,
  label,
}: AdminLanguageSwitchProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentUrl = `${pathname ?? "/admin/dashboard"}${search ? `?${search}` : ""}`;

  return (
    <form action={setAdminLanguageAction}>
      <input type="hidden" name="next" value={currentUrl} />
      <div
        className="flex items-center gap-2 rounded-full border border-soil/15 bg-bark/[0.06] px-3 py-2 text-[0.76rem] uppercase tracking-[0.24em] text-bark/75"
        role="group"
        aria-label={label}
      >
        <button
          type="submit"
          name="language"
          value="mk"
          className={
            currentLanguage === "mk"
              ? ACTIVE_BUTTON_CLASS_NAME
              : BASE_BUTTON_CLASS_NAME
          }
          aria-pressed={currentLanguage === "mk"}
        >
          MK
        </button>
        <span className="text-bark/30">|</span>
        <button
          type="submit"
          name="language"
          value="en"
          className={
            currentLanguage === "en"
              ? ACTIVE_BUTTON_CLASS_NAME
              : BASE_BUTTON_CLASS_NAME
          }
          aria-pressed={currentLanguage === "en"}
        >
          EN
        </button>
      </div>
    </form>
  );
}
