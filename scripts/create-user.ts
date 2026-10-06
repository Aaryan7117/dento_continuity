/**
 * Create or update a staff account.
 *
 *   npx tsx scripts/create-user.ts --clinic demo --email a@b.c --name "Dr A" --role DENTIST --password 'secret'
 *
 * `--clinic` is the clinic slug. Add `--new-clinic "Clinic Name"` to create the
 * clinic first. Re-running with an existing email resets that user's password.
 */
import "dotenv/config";
import { prismaUnscoped as prisma } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { runAsClinic } from "../lib/tenant";
import { recordAudit } from "../lib/audit";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = arg("clinic");
  const email = arg("email")?.toLowerCase();
  const name = arg("name");
  const role = arg("role") as "OWNER" | "DENTIST" | "FRONT_DESK" | undefined;
  const password = arg("password");
  const newClinicName = arg("new-clinic");

  if (!slug || !email || !name || !role || !password) {
    console.error("Required: --clinic --email --name --role OWNER|DENTIST|FRONT_DESK --password");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  let clinic = await prisma.clinic.findUnique({ where: { slug } });
  if (!clinic) {
    if (!newClinicName) {
      console.error(`No clinic with slug "${slug}". Pass --new-clinic "Name" to create it.`);
      process.exit(1);
    }
    clinic = await prisma.clinic.create({ data: { slug, name: newClinicName } });
    console.log(`Created clinic ${clinic.name} (${clinic.id})`);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, isActive: true, clinicId: clinic.id },
    create: { email, name, role, passwordHash, clinicId: clinic.id },
  });

  await runAsClinic(clinic.id, () =>
    recordAudit({
      actor: { id: null, role: null },
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      metadata: { email, role, via: "scripts/create-user.ts" },
    })
  );

  console.log(`User ${user.email} (${user.role}) ready for clinic ${clinic.slug}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
