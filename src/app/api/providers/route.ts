import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const providers = await prisma.provider.findMany({
      orderBy: { id: 'asc' },
      include: {
        assignments: {
          include: {
            lead: {
              include: { service: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    const monthlyCounts = await prisma.providerMonthlyCount.findMany();
    const countMap = new Map(monthlyCounts.map(mc => [mc.providerId, mc]));

    const result = providers.map(provider => {
      const monthCount = countMap.get(provider.id);
      const currentCount =
        monthCount?.monthYear === currentMonth ? monthCount.count : 0;

      return {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        monthlyQuota: provider.monthlyQuota,
        currentMonthLeads: currentCount,
        remainingQuota: Math.max(0, provider.monthlyQuota - currentCount),
        totalLeads: provider.assignments.length,
        leads: provider.assignments.map(a => ({
          id: a.lead.id,
          name: a.lead.name,
          phone: a.lead.phone,
          city: a.lead.city,
          service: a.lead.service.name,
          serviceCode: a.lead.service.code,
          description: a.lead.description,
          assignedAt: a.assignedAt,
          createdAt: a.lead.createdAt,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
