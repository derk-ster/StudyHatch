import { NextRequest, NextResponse } from 'next/server';

// Simple payment verification endpoint
// In production, you'd verify against Cash App transactions
// For now, this is a simple code-based system

// Store of valid payment codes (in production, use a database)
// Format: { code: string, plan: 'premium' | 'ai-chat', amount: number, used: boolean, createdAt: number }
const paymentCodes = new Map<string, { plan: string; amount: number; used: boolean; createdAt: number }>();

// Generate a unique payment code
function generatePaymentCode(): string {
  return `STUDY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, plan, code } = body;

    // Generate payment code
    if (action === 'generate') {
      const paymentCode = generatePaymentCode();
      const amount = plan === 'premium' ? 12.99 : plan === 'ai-chat' ? 1.99 : 0;
      
      paymentCodes.set(paymentCode, {
        plan,
        amount,
        used: false,
        createdAt: Date.now(),
      });

      // Clean up old codes (older than 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      for (const [key, value] of paymentCodes.entries()) {
        if (value.createdAt < oneDayAgo) {
          paymentCodes.delete(key);
        }
      }

      const cashAppTagRaw = process.env.NEXT_PUBLIC_CASH_APP_TAG || process.env.CASH_APP_TAG || '$StudyHatch01';
      const cashAppTag = cashAppTagRaw.trim().startsWith('$') ? cashAppTagRaw.trim() : `$${cashAppTagRaw.trim()}`;

      const paypalUsernameRaw = process.env.NEXT_PUBLIC_PAYPAL_USERNAME || 'StudyHatch01';
      const paypalUsername = paypalUsernameRaw.trim().replace(/^@/, '');
      
      return NextResponse.json({
        paymentCode,
        amount,
        cashAppTag,
        paypalUsername,
        instructions: {
          cashapp: `Send $${amount.toFixed(2)} to ${cashAppTag} on Cash App with the note: ${paymentCode}`,
          paypal: paypalUsername 
            ? `Send $${amount.toFixed(2)} via PayPal to @${paypalUsername} with the note: ${paymentCode}`
            : `Send $${amount.toFixed(2)} via PayPal. Include this code in the payment note: ${paymentCode}`,
          card: `Contact support to complete card payment. Include code: ${paymentCode}`,
        },
      });
    }

    // Verify payment code
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json(
          { error: 'Payment code is required' },
          { status: 400 }
        );
      }

      const paymentData = paymentCodes.get(code);
      
      if (!paymentData) {
        return NextResponse.json(
          { error: 'Invalid payment code' },
          { status: 404 }
        );
      }

      if (paymentData.used) {
        return NextResponse.json(
          { error: 'This payment code has already been used' },
          { status: 400 }
        );
      }

      // Mark as used
      paymentData.used = true;

      return NextResponse.json({
        success: true,
        plan: paymentData.plan,
        message: 'Payment verified! Your account has been upgraded.',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
