/**
 * LEAD ALLOCATION ENGINE
 * 
 * Core business logic for assigning providers to leads.
 * 
 * Algorithm:
 * 1. Determine mandatory providers for the service
 * 2. Filter mandatory providers by quota availability
 * 3. Fill remaining slots using fair round-robin from pool
 * 4. Persist allocation state to DB (survives restarts)
 * 5. Use DB transactions to prevent race conditions
 */

import { prisma } from './prisma';

// Mandatory assignment rules
const MANDATORY_RULES: Record<string, string[]> = {
  SERVICE_1: ['P1'],
  SERVICE_2: ['P5'],
  SERVICE_3: ['P1', 'P4'],
};

// Fair pool definitions (non-mandatory providers per service)
const POOL_RULES: Record<string, string[]> = {
  SERVICE_1: ['P2', 'P3', 'P4'],
  SERVICE_2: ['P6', 'P7', 'P8'],
  SERVICE_3: ['P2', 'P3', 'P5', 'P6', 'P7', 'P8'],
};

const TOTAL_ASSIGNMENTS_PER_LEAD = 3;

export async function assignProvidersToLead(
  leadId: number,
  serviceCode: string
): Promise<number[]> {
  /**
   * Uses a serialized DB transaction with SELECT FOR UPDATE
   * to prevent race conditions during concurrent lead creation.
   * 
   * The AllocationCounter rows are locked per service, so two
   * simultaneous requests cannot pick the same provider.
   */
  return await prisma.$transaction(async (tx) => {
    const service = await tx.service.findUniqueOrThrow({
      where: { code: serviceCode },
    });

    // Lock allocation counters for this service to prevent race conditions
    // Raw query for SELECT FOR UPDATE (Prisma doesn't support this natively)
    await tx.$executeRaw`
      SELECT id FROM AllocationCounter 
      WHERE serviceId = ${service.id} 
      FOR UPDATE
    `;

    // Get current month for quota check
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get all provider monthly counts
    const monthlyCounts = await tx.providerMonthlyCount.findMany();
    const countMap = new Map(monthlyCounts.map(mc => [mc.providerId, mc]));

    // Get all providers
    const allProviders = await tx.provider.findMany();
    const providerMap = new Map(allProviders.map(p => [p.code, p]));

    // --- STEP 1: Assign mandatory providers ---
    const mandatoryCodes = MANDATORY_RULES[serviceCode] || [];
    const assignedProviderIds: number[] = [];

    for (const code of mandatoryCodes) {
      const provider = providerMap.get(code);
      if (!provider) continue;

      const monthCount = countMap.get(provider.id);
      const currentCount = monthCount?.monthYear === currentMonth ? monthCount.count : 0;

      if (currentCount < provider.monthlyQuota) {
        assignedProviderIds.push(provider.id);
      }
      // If mandatory provider is at quota, we skip them (graceful degradation)
    }

    // --- STEP 2: Fill remaining slots with fair round-robin ---
    const remainingSlots = TOTAL_ASSIGNMENTS_PER_LEAD - assignedProviderIds.length;

    if (remainingSlots > 0) {
      const poolCodes = POOL_RULES[serviceCode] || [];
      
      // Get allocation counters for this service pool, ordered by position
      const counters = await tx.allocationCounter.findMany({
        where: {
          serviceId: service.id,
          provider: { code: { in: poolCodes } },
        },
        include: { provider: true },
        orderBy: { position: 'asc' },
      });

      // Filter pool to providers not already assigned and within quota
      const eligibleCounters = counters.filter(counter => {
        if (assignedProviderIds.includes(counter.providerId)) return false;
        const monthCount = countMap.get(counter.providerId);
        const currentCount = monthCount?.monthYear === currentMonth ? monthCount.count : 0;
        return currentCount < counter.provider.monthlyQuota;
      });

      // Round-robin: sort by turnCount (ascending) then position for stability
      // Provider with fewest assignments gets picked first
      eligibleCounters.sort((a, b) => {
        if (a.turnCount !== b.turnCount) return a.turnCount - b.turnCount;
        return a.position - b.position;
      });

      // Pick the required number of providers
      const selectedCounters = eligibleCounters.slice(0, remainingSlots);

      for (const counter of selectedCounters) {
        assignedProviderIds.push(counter.providerId);

        // Increment turn count to track rotation
        await tx.allocationCounter.update({
          where: { id: counter.id },
          data: { turnCount: { increment: 1 } },
        });
      }
    }

    // --- STEP 3: Create assignment records ---
    for (const providerId of assignedProviderIds) {
      await tx.leadAssignment.create({
        data: { leadId, providerId },
      });

      // Update monthly count
      const monthCount = countMap.get(providerId);
      const needsReset = !monthCount || monthCount.monthYear !== currentMonth;

      await tx.providerMonthlyCount.upsert({
        where: { providerId },
        update: {
          count: needsReset ? 1 : { increment: 1 },
          monthYear: currentMonth,
        },
        create: {
          providerId,
          count: 1,
          monthYear: currentMonth,
        },
      });
    }

    return assignedProviderIds;
  }, {
    timeout: 10000, // 10s timeout for transaction
    maxWait: 5000,
  });
}
