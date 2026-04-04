"use server";

import {
  HomepageNotifyConflictError,
  HomepageNotifyValidationError,
  submitHomepageNotifySignup,
} from "@/lib/services/homepage";

export type HomepageNotifyActionState = {
  status: "idle" | "success" | "error";
  code: "validation" | "conflict" | "unknown" | null;
};

export const INITIAL_HOMEPAGE_NOTIFY_ACTION_STATE: HomepageNotifyActionState = {
  status: "idle",
  code: null,
};

export async function submitHomepageNotifyAction(
  _previousState: HomepageNotifyActionState,
  formData: FormData,
): Promise<HomepageNotifyActionState> {
  try {
    await submitHomepageNotifySignup({
      full_name: formData.get("full_name"),
      email_or_phone: formData.get("email_or_phone"),
    });

    return {
      status: "success",
      code: null,
    };
  } catch (error) {
    if (error instanceof HomepageNotifyValidationError) {
      return {
        status: "error",
        code: "validation",
      };
    }

    if (error instanceof HomepageNotifyConflictError) {
      return {
        status: "error",
        code: "conflict",
      };
    }

    return {
      status: "error",
      code: "unknown",
    };
  }
}
