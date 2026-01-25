import { NextRequest, NextResponse } from 'next/server';
import { isSchoolModeEnabled } from '@/lib/school-mode';

// Mock Stripe subscription cancellation
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
    const { subscriptionId } = body;

    // In production, cancel the Stripe subscription:
    /*
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Cancel at period end (user keeps access until billing period ends)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    // Or cancel immediately:
    // await stripe.subscriptions.cancel(subscriptionId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
    });
    */

    // Mock response for development
    return NextResponse.json({
      success: true,
      message: 'Subscription cancellation mocked. In production, this would cancel the Stripe subscription.',
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
