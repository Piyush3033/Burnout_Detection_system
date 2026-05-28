import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/app/lib/backend';

export async function getAuthToken(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value ?? null;
}

export async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
  options?: { method?: string; requireAuth?: boolean }
): Promise<NextResponse> {
  const requireAuth = options?.requireAuth !== false;
  const token = await getAuthToken(req);

  if (requireAuth && !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}${backendPath}${url.search}`;
  const method = options?.method ?? req.method;

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = req.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const response = await fetch(targetUrl, { method, headers, body });
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: text || 'Backend error' };
    }
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        error: 'Backend unavailable',
        hint: 'Set BACKEND_URL on Vercel to your Render server URL',
      },
      { status: 503 }
    );
  }
}
