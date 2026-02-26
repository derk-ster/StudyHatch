import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
    const expected = typeof body.expected === 'string' ? body.expected.trim() : '';
    const language = typeof body.language === 'string' ? body.language : 'Spanish';

    if (!transcript || !expected) {
      return NextResponse.json(
        { error: 'transcript and expected are required' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateKey = getRateLimitKey('pronunciation-match', ip);
    const { allowed } = rateLimit(`pronunciation-match:${rateKey}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again in a moment.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { match: false, error: 'AI not configured' },
        { status: 200 }
      );
    }

    const groq = new Groq({ apiKey });

    const prompt = `You are a pronunciation checker for a language learning app. The learner was supposed to say this word or phrase in ${language}: "${expected}". The speech-to-text transcribed what they said as: "${transcript}".

Could this transcription be a common mishearing or misspelling of the expected word? Consider similar sounds (e.g. c/s, b/v, double letters, missing/extra letters). Reply with exactly one word: YES or NO.`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const text = (completion.choices[0]?.message?.content || '').trim().toUpperCase();
    const match = text.startsWith('YES');

    return NextResponse.json({ match });
  } catch (error) {
    console.error('Pronunciation match API error:', error);
    return NextResponse.json(
      { match: false, error: 'Check failed' },
      { status: 200 }
    );
  }
}
