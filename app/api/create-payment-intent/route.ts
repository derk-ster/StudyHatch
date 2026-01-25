import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isSchoolModeEnabled } from '@/lib/school-mode';

export async function POST(request: NextRequest) {
  try {
    if (isSchoolModeEnabled()) {
      return NextResponse.json({ error: 'Payments are disabled in School Edition.' }, { status: 403 });
    }
    // Check if Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey || stripeSecretKey.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.',
          needsConfiguration: true
        },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
