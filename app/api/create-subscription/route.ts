import { NextRequest, NextResponse } from 'next/server';
import { isSchoolModeEnabled } from '@/lib/school-mode';

// Mock Stripe subscription creation
// In production, uncomment and configure Stripe:
/*
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});
*/

export async function POST(request: NextRequest) {
  try {
    if (isSchoolModeEnabled()) {
      return NextResponse.json({ error: 'Subscriptions are disabled in School Edition.' }, { status: 403 });
    }
    const body = await request.json();
    const { plan, priceId } = body;

    if (plan !== 'ai-chat') {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // In production, create a Stripe subscription:
    /*
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || process.env.STRIPE_AI_CHAT_PRICE_ID, // e.g., 'price_xxx' for $1.99/month
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?success=true&plan=ai-chat`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        plan: 'ai-chat',
      },
    });

    return NextResponse.json({ url: session.url });
    */

    // Mock response for development
    return NextResponse.json({
      url: '/pricing?mock=true&plan=ai-chat',
      message: 'Stripe subscription integration not configured. Set STRIPE_SECRET_KEY and STRIPE_AI_CHAT_PRICE_ID in .env.local',
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
