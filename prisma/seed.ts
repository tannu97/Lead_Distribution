import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // SERVICES
  const services = [
    { name: "Service 1", code: "SERVICE_1" },
    { name: "Service 2", code: "SERVICE_2" },
    { name: "Service 3", code: "SERVICE_3" },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { code: service.code }, // ✅ correct unique field
      update: {},
      create: service,
    });
  }

  // PROVIDERS
  const providers = [
    { name: "Provider 1", code: "P1" },
    { name: "Provider 2", code: "P2" },
    { name: "Provider 3", code: "P3" },
    { name: "Provider 4", code: "P4" },
    { name: "Provider 5", code: "P5" },
    { name: "Provider 6", code: "P6" },
    { name: "Provider 7", code: "P7" },
    { name: "Provider 8", code: "P8" },
  ];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { code: provider.code }, // ✅ correct unique field
      update: {},
      create: {
        ...provider,
        monthlyQuota: 10,
      },
    });
  }

  // Allocation counters (round robin base setup)
  const allServices = await prisma.service.findMany();
  const allProviders = await prisma.provider.findMany();

  for (const service of allServices) {
    for (let i = 0; i < allProviders.length; i++) {
      await prisma.allocationCounter.upsert({
        where: {
          serviceId_providerId: {
            serviceId: service.id,
            providerId: allProviders[i].id,
          },
        },
        update: {},
        create: {
          serviceId: service.id,
          providerId: allProviders[i].id,
          position: i,
          turnCount: 0,
        },
      });
    }
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });