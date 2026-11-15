import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../dist/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const username = process.env.ADMIN_USERNAME?.trim() || "admin";

if (!connectionString || !email || !password || password.length > 256) {
  throw new Error("Cấu hình DATABASE_URL, ADMIN_EMAIL và ADMIN_PASSWORD không hợp lệ.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const passwordHash = await hash(password, 12);
  const current = await prisma.adminUser.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (current) {
    await prisma.adminUser.update({
      where: { id: current.id },
      data: { email, passwordHash, displayName: "Cherylish Admin", role: "SUPER_ADMIN", isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    });
  } else {
    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash, displayName: "Cherylish Admin", role: "SUPER_ADMIN", isActive: true, failedLoginAttempts: 0, lockedUntil: null },
      create: { email, passwordHash, displayName: "Cherylish Admin", role: "SUPER_ADMIN", isActive: true },
    });
  }
  console.log(`Admin bootstrap configured for username "${username}".`);
} finally {
  await prisma.$disconnect();
}
