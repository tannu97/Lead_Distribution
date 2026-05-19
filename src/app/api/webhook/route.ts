import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sseManager } from '@/lib/sse';

/**
 * WEBHOOK ENDPOINT - Idempotent quota reset
 * 
 * Idempotency strategy:
 * 1. Caller must provide a unique `eventId` in the request
 * 2. We check if this eventId was already processed (WebhookEvent table)
 * 3. If already processed → return 200 with "already processed" flag
 * 4. If new → process and store eventId atomically in a transaction
 * 5. Same eventId can be called 100 times → quota resets exactly ONCE
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventType, payload } = body;

    if (!eventId || !eventType) {
      return NextResponse.json(
        { error: 'eventId and eventType are required' },
        { status: 400 }
      );
    }

    // Idempotency check + process in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if this event was already processed
      const existingEvent = await tx.webhookEvent.findUnique({
        where: { eventId },
      });

      if (existingEvent) {
        return {
          alreadyProcessed: true,
          processedAt: existingEvent.processedAt,
        };
      }

      // Store the event FIRST (before processing) to prevent double execution
      await tx.webhookEvent.create({
        data: { eventId, eventType, payload: payload || {} },
      });

      // Process based on event type
      if (eventType === 'SUBSCRIPTION_PAYMENT_SUCCESS') {
        // Reset all provider quotas to 10
        const currentMonth = new Date().toISOString().slice(0, 7);
        const providers = await tx.provider.findMany();

        for (const provider of providers) {
          await tx.providerMonthlyCount.upsert({
            where: { providerId: provider.id },
            update: { count: 0, monthYear: currentMonth },
            create: { providerId: provider.id, count: 0, monthYear: currentMonth },
          });
        }

        return { alreadyProcessed: false, action: 'QUOTA_RESET', providersReset: providers.length };
      }

      return { alreadyProcessed: false, action: 'UNKNOWN_EVENT' };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: 'Event already processed - no action taken',
        processedAt: result.processedAt,
      });
    }

    // Broadcast quota reset to dashboard
    sseManager.broadcast('quota_reset', { message: 'Provider quotas have been reset' });

    return NextResponse.json({
      success: true,
      idempotent: false,
      message: 'Webhook processed successfully',
      result,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
