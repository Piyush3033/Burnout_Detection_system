import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/lib/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToBackend(req, `/api/admin/users/${userId}`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToBackend(req, `/api/admin/users/${userId}/notify`, { method: 'POST' });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyToBackend(req, `/api/admin/users/${userId}`, { method: 'DELETE' });
}
