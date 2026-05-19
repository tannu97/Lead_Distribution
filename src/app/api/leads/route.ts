import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignProvidersToLead } from '@/lib/allocation';
import { sseManager } from '@/lib/sse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, city, serviceCode, description } = body;

    // Validate required fields
    if (!name || !phone || !city || !serviceCode || !description) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Phone format validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\+]/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Find the service
    const service = await prisma.service.findUnique({
      where: { code: serviceCode },
    });

    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Create lead (DB-level unique constraint will catch duplicates)
    let lead;
    try {
      lead = await prisma.lead.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          description: description.trim(),
          serviceId: service.id,
        },
      });
    } catch (err: unknown) {
      // MySQL unique constraint violation code
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err.code === 'P2002' || (err as { meta?: { target?: string[] } }).meta?.target?.includes('unique_phone_service'))
      ) {
        return NextResponse.json(
          { error: 'You have already submitted a request for this service with this phone number.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // Assign providers using allocation engine
    const assignedProviderIds = await assignProvidersToLead(lead.id, serviceCode);

    // Fetch full assignment details for response + SSE broadcast
    const fullLead = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: {
        service: true,
        assignments: {
          include: { provider: true },
        },
      },
    });

    // Broadcast to all connected SSE clients
    sseManager.broadcast('lead_assigned', {
      lead: fullLead,
      providerIds: assignedProviderIds,
    });

    return NextResponse.json(
      {
        success: true,
        lead: fullLead,
        assignedProviders: assignedProviderIds.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Lead creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create lead. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        service: true,
        assignments: {
          include: { provider: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
