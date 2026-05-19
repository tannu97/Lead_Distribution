// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Services
  const services = [
    { name: "Service 1", slug: "service-1" },
    { name: "Service 2", slug: "service-2" },
    { name: "Service 3", slug: "service-3" },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: service,
    });
  }

  const currentMonth = format(new Date(), "yyyy-MM");

  // Providers (8 total)
  const providers = [
    { name: "Provider 1", email: "provider1@prowider.com" },
    { name: "Provider 2", email: "provider2@prowider.com" },
    { name: "Provider 3", email: "provider3@prowider.com" },
    { name: "Provider 4", email: "provider4@prowider.com" },
    { name: "Provider 5", email: "provider5@prowider.com" },
    { name: "Provider 6", email: "provider6@prowider.com" },
    { name: "Provider 7", email: "provider7@prowider.com" },
    { name: "Provider 8", email: "provider8@prowider.com" },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { email: provider.email },
      update: {},
      create: {
        ...provider,
        monthlyQuota: 10,
        currentMonthCount: 0,
        quotaResetMonth: currentMonth,
      },
    });
  }

  // Allocation states (one per service)
  const allServices = await prisma.service.findMany();
  for (const service of allServices) {
    await prisma.allocationState.upsert({
      where: { serviceId: service.id },
      update: {},
      create: { serviceId: service.id, pointer: 0 },
    });
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
