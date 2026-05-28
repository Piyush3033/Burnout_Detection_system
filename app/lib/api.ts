/**
 * API Client for communicating with backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

// Auth APIs
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

// User APIs
export const userAPI = {
  getProfile: () => apiCall('/api/user/profile'),

  updateProfile: (data: any) =>
    apiCall('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getBurnoutScore: () => apiCall('/api/user/burnout-score'),

  getBurnoutHistory: (days: number = 30) =>
    apiCall(`/api/user/burnout-history?days=${days}`),
};

// Activity APIs
export const activityAPI = {
  logActivity: (data: any) =>
    apiCall('/api/activity/log', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLogs: (days: number = 7) =>
    apiCall(`/api/activity/logs?days=${days}`),

  getDailySummary: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiCall(`/api/activity/daily-summary${query}`);
  },
};

// Admin APIs
export const adminAPI = {
  getUsers: (page: number = 1, limit: number = 20) =>
    apiCall(`/api/admin/users?page=${page}&limit=${limit}`),

  getUserDetails: (userId: string) =>
    apiCall(`/api/admin/users/${userId}`),

  getAnalytics: () => apiCall('/api/admin/analytics'),

  deactivateUser: (userId: string) =>
    apiCall(`/api/admin/users/${userId}/deactivate`, {
      method: 'POST',
    }),

  getJobLogs: (limit: number = 50) =>
    apiCall(`/api/admin/job-logs?limit=${limit}`),
};

// ML Service APIs
export const mlAPI = {
  calculateScore: (data: any) =>
    fetch(`${process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000'}/api/scoring/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  analyzeTrends: (scores: number[], days: number = 7) =>
    fetch(`${process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000'}/api/analytics/trends?days=${days}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    }).then(r => r.json()),

  forecast: (scores: number[], daysAhead: number = 7) =>
    fetch(`${process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000'}/api/analytics/forecast?days_ahead=${daysAhead}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores }),
    }).then(r => r.json()),

  getRiskLevels: () =>
    fetch(`${process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8000'}/api/scoring/risk-levels`).then(r => r.json()),
};
