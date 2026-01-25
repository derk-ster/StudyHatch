import { NextRequest, NextResponse } from 'next/server';
import { isSchoolModeEnabled } from '@/lib/school-mode';

export async function POST(request: NextRequest) {
  try {
    if (isSchoolModeEnabled()) {
      return NextResponse.json({ error: 'Payments are disabled in School Edition.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Payments have been retired in StudyHatch.' },
      { status: 410 }
    );
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
