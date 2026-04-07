import {
  getInitialAdminSeedInput,
  seedInitialAdminIfMissing,
} from "../lib/config/admin-bootstrap";
import { DEFAULT_SITE_SETTINGS } from "../lib/config/site-settings";
import { createPrismaClient } from "../lib/db";
import { hashPassword } from "../lib/security/passwords";

const prisma = createPrismaClient();

async function main() {
  await seedDefaultSiteSettings();
  await seedInitialAdmin();
}

async function seedDefaultSiteSettings() {
  await Promise.all(
    Object.entries(DEFAULT_SITE_SETTINGS).map(([key, value_json]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value_json },
        create: { key, value_json },
      }),
    ),
  );
}

async function seedInitialAdmin() {
  await seedInitialAdminIfMissing({
    adminDelegate: prisma.admin,
    initialAdmin: getInitialAdminSeedInput(),
    hashPassword,
  });
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
