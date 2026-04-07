export type InitialAdminSeedInput = {
  email: string;
  password: string;
};

export type AdminCreateData = {
  email: string;
  password_hash: string;
  is_active: boolean;
};

type AdminLookupResult = {
  id: string;
} | null;

type AdminDelegate = {
  findUnique(args: {
    where: { email: string };
    select: { id: true };
  }): Promise<AdminLookupResult>;
  create(args: { data: AdminCreateData }): Promise<unknown>;
};

export function getInitialAdminSeedInput(
  env: Record<string, string | undefined> = process.env,
): InitialAdminSeedInput | null {
  const email = env.INITIAL_ADMIN_EMAIL?.trim();
  const password = env.INITIAL_ADMIN_PASSWORD?.trim();

  if (!email && !password) {
    return null;
  }

  if (!email || !password) {
    throw new Error(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must both be set to bootstrap the initial admin user.",
    );
  }

  return {
    email: email.toLowerCase(),
    password,
  };
}

export async function seedInitialAdminIfMissing({
  adminDelegate,
  initialAdmin,
  hashPassword,
}: {
  adminDelegate: AdminDelegate;
  initialAdmin: InitialAdminSeedInput | null;
  hashPassword: (password: string) => Promise<string>;
}): Promise<"skipped" | "exists" | "created"> {
  if (!initialAdmin) {
    return "skipped";
  }

  const existingAdmin = await adminDelegate.findUnique({
    where: { email: initialAdmin.email },
    select: { id: true },
  });

  if (existingAdmin) {
    return "exists";
  }

  await adminDelegate.create({
    data: {
      email: initialAdmin.email,
      password_hash: await hashPassword(initialAdmin.password),
      is_active: true,
    },
  });

  return "created";
}
