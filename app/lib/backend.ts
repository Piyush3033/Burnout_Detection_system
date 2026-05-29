const backendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');

if (!backendUrl && process.env.NODE_ENV === 'production') {
  console.error('Missing BACKEND_URL or NEXT_PUBLIC_BACKEND_URL in production. Set it to your backend URL.');
}

export const BACKEND_URL = backendUrl;
