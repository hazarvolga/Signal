import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function hashPassword(password) {
  if (password.length < 14 || password.length > 128) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must be between 14 and 128 characters");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  const email = required("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const passwordHash = hashPassword(required("BOOTSTRAP_ADMIN_PASSWORD"));
  const organizationName = required("BOOTSTRAP_ORGANIZATION_NAME");
  const organizationSlug = required("BOOTSTRAP_ORGANIZATION_SLUG").toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug)) {
    throw new Error("BOOTSTRAP_ORGANIZATION_SLUG must be a lowercase URL-safe slug");
  }

  await prisma.$transaction(async (tx) => {
    if ((await tx.user.count()) > 0) {
      throw new Error("Bootstrap refused: at least one user already exists");
    }
    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      update: {},
      create: { name: organizationName, slug: organizationSlug },
    });
    await tx.user.create({
      data: {
        email,
        name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Signal Owner",
        passwordHash,
        role: "OWNER",
        status: "ACTIVE",
        organizationId: organization.id,
      },
    });
  });
  console.log("Initial owner created. Remove BOOTSTRAP_ADMIN_PASSWORD from the environment now.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

