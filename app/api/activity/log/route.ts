import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/lib/proxy';

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/api/activity/log');
}
