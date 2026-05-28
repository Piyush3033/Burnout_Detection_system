import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/lib/proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToBackend(req, `/api/admin/users/${userId}/deactivate`, { method: 'POST' });
}
