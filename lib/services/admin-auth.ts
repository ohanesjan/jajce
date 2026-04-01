import { createHmac, timingSafeEqual } from "node:crypto";
import type { Admin, PrismaClient } from "@prisma/client";
import { verifyPassword } from "@/lib/security/passwords";

export const ADMIN_SESSION_COOKIE_NAME = "jajce_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthenticatedAdmin = Pick<Admin, "id" | "email" | "last_login_at">;

export type AdminSessionTokenPayload = {
  adminId: string;
  expiresAt: number;
};

type AdminLookup = Pick<
  Admin,
  "id" | "email" | "password_hash" | "is_active" | "last_login_at"
>;

type AdminDelegate = Pick<PrismaClient["admin"], "findUnique" | "update">;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function authenticateAdminCredentials({
  adminDelegate,
  email,
  password,
  now = new Date(),
  verifyPasswordFn = verifyPassword,
}: {
  adminDelegate: AdminDelegate;
  email: string;
  password: string;
  now?: Date;
  verifyPasswordFn?: typeof verifyPassword;
}): Promise<AuthenticatedAdmin | null> {
  const normalizedEmail = normalizeAdminEmail(email);
  const admin = (await adminDelegate.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_active: true,
      last_login_at: true,
    },
  })) as AdminLookup | null;

  if (!admin || !admin.is_active) {
    return null;
  }

  const isValidPassword = await verifyPasswordFn(password, admin.password_hash);

  if (!isValidPassword) {
    return null;
  }

  return (await adminDelegate.update({
    where: { id: admin.id },
    data: { last_login_at: now },
    select: {
      id: true,
      email: true,
      last_login_at: true,
    },
  })) as AuthenticatedAdmin;
}

export function getAdminSessionSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = env.ADMIN_SESSION_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_SESSION_SECRET must be set in production to protect admin sessions.",
    );
  }

  return "development-admin-session-secret";
}

export function createAdminSessionToken(
  payload: AdminSessionTokenPayload,
  secret: string,
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${encodedPayload}.${signAdminSessionPayload(encodedPayload, secret)}`;
}

export function readAdminSessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): AdminSessionTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signAdminSessionPayload(encodedPayload, secret);

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  if (
    typeof parsedPayload !== "object" ||
    parsedPayload === null ||
    typeof (parsedPayload as { adminId?: unknown }).adminId !== "string" ||
    typeof (parsedPayload as { expiresAt?: unknown }).expiresAt !== "number"
  ) {
    return null;
  }

  const payload = parsedPayload as AdminSessionTokenPayload;

  if (payload.expiresAt <= now.getTime()) {
    return null;
  }

  return payload;
}

export function getProtectedAdminRedirectPath(
  session: AuthenticatedAdmin | null,
): string | null {
  return session ? null : "/admin/login";
}

export function getAdminLoginRedirectPath(
  session: AuthenticatedAdmin | null,
): string | null {
  return session ? "/admin/dashboard" : null;
}

function signAdminSessionPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
