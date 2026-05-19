// src/lib/allocation-engine.ts
/**
 * LEAD ALLOCATION ENGINE
 *
 * Algorithm:
 * 1. Identify mandatory providers for the service
 * 2. Filter out mandatory providers who have exceeded quota
 * 3. Fill remaining slots from optional pool using round-robin pointer
 *    (pointer stored in DB so it persists across restarts)
 * 4. All operations run inside a MySQL transaction with SELECT ... FOR UPDATE
 *    to prevent race conditions under concurrent requests
 *
 * Concurrency Safety:
 * - `SELECT ... FOR UPDATE` on AllocationState row locks the pointer row
 *   so two simultaneous requests cannot read the same pointer value
 * - The entire assignment (pointer update + provider quota update +
 *   LeadAssignment inserts) is a single atomic transaction
 */

import { prisma } from "./prisma";
import { format } from "date-fns";

// Mandatory rules: serviceSlug → provider names that MUST be assigned
const MANDATORY_RULES: Record<string, string[]> = {
  "service-1": ["Provider 1"],
  "service-2": ["Provider 5"],
  "service-3": ["Provider 1", "Provider 4"],
};

// Optional pools: serviceSlug → ordered list of providers to round-robin
const OPTIONAL_POOLS: Record<string, string[]> = {
  "service-1": ["Provider 2", "Provider 3", "Provider 4"],
  "service-2": ["Provider 6", "Provider 7", "Provider 8"],
  "service-3": ["Provider 2", "Provider 3", "Provider 5", "Provider 6", "Provider 7", "Provider 8"],
};

const ASSIGNMENTS_PER_LEAD = 3;

export interface AllocationResult {
  assignedProviderIds: number[];
  assignedProviderNames: string[];
  skippedDueToQuota: string[];
}

export async function assignProvidersToLead(
  leadId: number,
  serviceId: number,
  serviceSlug: string
): Promise<AllocationResult> {
  const currentMonth = format(new Date(), "yyyy-MM");
  const skippedDueToQuota: string[] = [];

  return await prisma.$transaction(
    async (tx) => {
      // 1. Lock the allocation state row for this service (prevents race conditions)
      // MySQL: SELECT ... FOR UPDATE
      const allocationState = await tx.$queryRaw<{ id: number; pointer: number }[]>`
        SELECT id, pointer FROM allocation_states
        WHERE serviceId = ${serviceId}
        FOR UPDATE
      `;

      if (!allocationState.length) {
        throw new Error(`No allocation state found for service ${serviceSlug}`);
      }

      const stateId = allocationState[0].id;
      let pointer = allocationState[0].pointer;

      // 2. Fetch all providers with their current quotas (locked)
      const allProviders = await tx.provider.findMany({
        select: { id: true, name: true, currentMonthCount: true, monthlyQuota: true, quotaResetMonth: true },
      });

      // Helper: check if provider has quota available (also handles month rollover)
      const hasQuota = (p: { currentMonthCount: number; monthlyQuota: number; quotaResetMonth: string }) => {
        // If provider's reset month is old, they have full quota
        if (p.quotaResetMonth !== currentMonth) return true;
        return p.currentMonthCount < p.monthlyQuota;
      };

      const providerMap = new Map(allProviders.map((p) => [p.name, p]));

      // 3. Assign mandatory providers
      const mandatoryNames = MANDATORY_RULES[serviceSlug] ?? [];
      const assignedIds: number[] = [];

      for (const name of mandatoryNames) {
        const provider = providerMap.get(name);
        if (!provider) continue;

        if (!hasQuota(provider)) {
          skippedDueToQuota.push(name);
          continue;
        }

        assignedIds.push(provider.id);
      }

      // 4. Fill remaining slots from optional pool (round-robin)
      const optionalPool = OPTIONAL_POOLS[serviceSlug] ?? [];
      let slotsNeeded = ASSIGNMENTS_PER_LEAD - assignedIds.length;
      let attempts = 0;
      const maxAttempts = optionalPool.length; // avoid infinite loop if entire pool is exhausted

      while (slotsNeeded > 0 && attempts < maxAttempts) {
        const candidateName = optionalPool[pointer % optionalPool.length];
        pointer = (pointer + 1) % optionalPool.length;
        attempts++;

        const candidate = providerMap.get(candidateName);
        if (!candidate) continue;

        // Skip if already assigned (e.g., optional pool overlaps with mandatory)
        if (assignedIds.includes(candidate.id)) continue;

        if (!hasQuota(candidate)) {
          skippedDueToQuota.push(candidateName);
          continue;
        }

        assignedIds.push(candidate.id);
        slotsNeeded--;
      }

      if (assignedIds.length === 0) {
        throw new Error("No providers available with remaining quota for this service.");
      }

      // 5. Persist updated pointer back to DB
      await tx.$executeRaw`
        UPDATE allocation_states SET pointer = ${pointer}, updatedAt = NOW()
        WHERE id = ${stateId}
      `;

      // 6. Create LeadAssignment records
      await tx.leadAssignment.createMany({
        data: assignedIds.map((providerId) => ({ leadId, providerId })),
        skipDuplicates: true,
      });

      // 7. Increment currentMonthCount for each assigned provider
      for (const pid of assignedIds) {
        const provider = allProviders.find((p) => p.id === pid)!;
        const needsReset = provider.quotaResetMonth !== currentMonth;

        await tx.provider.update({
          where: { id: pid },
          data: {
            currentMonthCount: needsReset ? 1 : { increment: 1 },
            quotaResetMonth: currentMonth,
          },
        });
      }

      const assignedNames = assignedIds.map(
        (id) => allProviders.find((p) => p.id === id)!.name
      );

      return {
        assignedProviderIds: assignedIds,
        assignedProviderNames: assignedNames,
        skippedDueToQuota,
      };
    },
    {
      isolationLevel: "Serializable", // Strongest isolation for correctness
      timeout: 10000,
    }
  );
}
