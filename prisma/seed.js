const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert Services
  const services = [
    { name: 'Service 1', code: 'SERVICE_1' },
    { name: 'Service 2', code: 'SERVICE_2' },
    { name: 'Service 3', code: 'SERVICE_3' },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }
  console.log('✅ Services seeded');

  // Upsert Providers
  const providers = Array.from({ length: 8 }, (_, i) => ({
    name: `Provider ${i + 1}`,
    code: `P${i + 1}`,
    monthlyQuota: 10,
  }));

  for (const p of providers) {
    await prisma.provider.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log('✅ Providers seeded');

  // Seed AllocationCounters (fair pool positions)
  // Service 1 pool: P2, P3, P4
  // Service 2 pool: P6, P7, P8
  // Service 3 pool: P2, P3, P5, P6, P7, P8
  const poolConfig = {
    SERVICE_1: ['P2', 'P3', 'P4'],
    SERVICE_2: ['P6', 'P7', 'P8'],
    SERVICE_3: ['P2', 'P3', 'P5', 'P6', 'P7', 'P8'],
  };

  for (const [serviceCode, providerCodes] of Object.entries(poolConfig)) {
    const service = await prisma.service.findUnique({ where: { code: serviceCode } });
    for (let i = 0; i < providerCodes.length; i++) {
      const provider = await prisma.provider.findUnique({ where: { code: providerCodes[i] } });
      await prisma.allocationCounter.upsert({
        where: { serviceId_providerId: { serviceId: service.id, providerId: provider.id } },
        update: {},
        create: {
          serviceId: service.id,
          providerId: provider.id,
          position: i,
          turnCount: 0,
        },
      });
    }
  }
  console.log('✅ Allocation counters seeded');

  // Initialize ProviderMonthlyCount for all providers
  const allProviders = await prisma.provider.findMany();
  const currentMonth = new Date().toISOString().slice(0, 7);
  for (const provider of allProviders) {
    await prisma.providerMonthlyCount.upsert({
      where: { providerId: provider.id },
      update: {},
      create: { providerId: provider.id, count: 0, monthYear: currentMonth },
    });
  }
  console.log('✅ Monthly counts initialized');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
