import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getAdminSessionSecret,
  type AuthenticatedAdmin,
  readAdminSessionToken,
} from "@/lib/services/admin-auth";

export type AdminSession = {
  admin: {
    id: string;
    email: string;
  };
};

export async function beginAdminSession(
  admin: Pick<AuthenticatedAdmin, "id">,
  now: Date = new Date(),
): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date(
    now.getTime() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  );
  const sessionToken = createAdminSessionToken(
    {
      adminId: admin.id,
      expiresAt: expiresAt.getTime(),
    },
    getAdminSessionSecret(),
  );

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const rawSessionToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!rawSessionToken) {
    return null;
  }

  const sessionPayload = readAdminSessionToken(
    rawSessionToken,
    getAdminSessionSecret(),
  );

  if (!sessionPayload) {
    return null;
  }

  const admin = await getDb().admin.findUnique({
    where: { id: sessionPayload.adminId },
    select: {
      id: true,
      email: true,
      is_active: true,
    },
  });

  if (!admin || !admin.is_active) {
    return null;
  }

  return {
    admin: {
      id: admin.id,
      email: admin.email,
    },
  };
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
