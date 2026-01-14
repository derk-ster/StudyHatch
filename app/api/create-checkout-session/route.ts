import { NextRequest, NextResponse } from 'next/server';

// Mock Stripe checkout session creation
// In production, uncomment and configure Stripe:
/*
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});
*/

export async function POST(request: NextRequest) {
  try {
    // In production, create a Stripe checkout session:
    /*
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'StudyHatch Premium',
              description: 'Unlimited decks and cards',
            },
            unit_amount: 1299, // $12.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
    */

    // Mock response for development
    return NextResponse.json({
      url: '/pricing?mock=true',
      message: 'Stripe integration not configured. Set STRIPE_SECRET_KEY in .env.local',
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
