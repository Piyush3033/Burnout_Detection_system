import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/app/lib/backend';

export async function POST(req: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      {
        error: 'Backend URL not configured',
        hint: 'Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL to your backend URL in Vercel/Render',
      },
      { status: 500 }
    );
  }

  try {
    const { email, password } = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    // Set secure HTTP-only cookie
    const res = NextResponse.json(data);
    res.cookies.set('token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Authentication failed',
        hint: 'Ensure BACKEND_URL is set on Vercel to your Render backend URL',
      },
      { status: 503 }
    );
  }
}
