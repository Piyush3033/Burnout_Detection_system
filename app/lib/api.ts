/**
 * API Client for communicating with backend (via Next.js proxy on Vercel)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const ML_SERVICE_URL =
  process.env.NEXT_PUBLIC_ML_URL || 'https://ml-service-1nhu.onrender.com';
export default API_URL;

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

export async function apiCall(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = new Error('API request failed') as ApiError;
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {
      error.data = { message: response.statusText };
    }
    throw error;
  }

  return response.json();
}

export const fetcher = (endpoint: string) => apiCall(endpoint);

export const authAPI = {
  register: (email: string, password: string, fullName?: string) =>
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    }),

  login: (email: string, password: string) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

export const userAPI = {
  getProfile: () => apiCall('/api/user/profile'),

  updateProfile: (data: Record<string, unknown>) =>
    apiCall('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getBurnoutScore: () => apiCall('/api/user/burnout-score'),

  getBurnoutHistory: (days: number = 30) =>
    apiCall(`/api/user/burnout-history?days=${days}`),

  getRecommendations: () => apiCall('/api/user/recommendations'),

  getAlerts: () => apiCall('/api/user/alerts'),
};

export const activityAPI = {
  logActivity: (data: Record<string, unknown>) =>
    apiCall('/api/activity/log', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLogs: (days: number = 7) => apiCall(`/api/activity/logs?days=${days}`),

  getDailySummary: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiCall(`/api/activity/daily-summary${query}`);
  },

  getAppUsage: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiCall(`/api/activity/app-usage${query}`);
  },
};

export const adminAPI = {
  getUsers: (page: number = 1, limit: number = 20) =>
    apiCall(`/api/admin/users?page=${page}&limit=${limit}`),

  getUserDetails: (userId: string) => apiCall(`/api/admin/users/${userId}`),

  getAnalytics: () => apiCall('/api/admin/analytics'),

  getSystemStats: () => apiCall('/api/admin/system-stats'),

  getUserStats: () => apiCall('/api/admin/user-stats'),

  getAlertStats: () => apiCall('/api/admin/alert-stats'),

  deactivateUser: (userId: string) =>
    apiCall(`/api/admin/users/${userId}/deactivate`, {
      method: 'POST',
    }),

  deleteUser: (userId: string) =>
    apiCall(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  sendUserNotification: (userId: string, message: string) =>
    apiCall(`/api/admin/users/${userId}/notify`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getJobLogs: (limit: number = 50) =>
    apiCall(`/api/admin/job-logs?limit=${limit}`),
};

export const mlAPI = {
  calculateScore: (data: Record<string, unknown>) =>
    fetch(`${ML_SERVICE_URL}/api/scoring/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  calculateRealtime: (data: Record<string, unknown>) =>
    fetch(`${ML_SERVICE_URL}/api/scoring/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  analyzeTrends: (scores: number[], days: number = 7) =>
    fetch(`${ML_SERVICE_URL}/api/analytics/trends?days=${days}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    }).then((r) => r.json()),

  forecast: (scores: number[], daysAhead: number = 7) =>
    fetch(`${ML_SERVICE_URL}/api/analytics/forecast?days_ahead=${daysAhead}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    }).then((r) => r.json()),

  getRiskLevels: () =>
    fetch(`${ML_SERVICE_URL}/api/scoring/risk-levels`).then((r) => r.json()),
};
