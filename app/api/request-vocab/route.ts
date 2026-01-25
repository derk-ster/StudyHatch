import { NextRequest, NextResponse } from 'next/server';
import { isSchoolModeEnabled } from '@/lib/school-mode';

export async function POST(request: NextRequest) {
  try {
    if (isSchoolModeEnabled()) {
      return NextResponse.json({ error: 'Payments are disabled in School Edition.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Paid deck requests have been retired.' },
      { status: 410 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
