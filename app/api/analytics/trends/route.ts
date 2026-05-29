import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ML_SERVICE_URL } from '@/app/lib/api';

export async function GET(req: NextRequest) {
  try {
    const range = req.nextUrl.searchParams.get('range') || '7d';
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `${ML_SERVICE_URL}/api/analytics/trends?range=${range}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
