// API service for communicating with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Set auth token in localStorage
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

// Get current user from localStorage
export function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Set current user in localStorage
export function setCurrentUser(user: any) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

// Check if we're online
function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Import offline queue functions
import {
  addToOfflineQueue,
  processOfflineQueue,
} from '../utils/offlineQueue';

// Cache API responses in IndexedDB or localStorage
const API_CACHE_KEY = 'apiCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedResponse {
  data: any;
  timestamp: number;
  endpoint: string;
}

function getCachedResponse(endpoint: string): any | null {
  try {
    const cacheStr = localStorage.getItem(API_CACHE_KEY);
    if (!cacheStr) return null;

    const cache: Record<string, CachedResponse> = JSON.parse(cacheStr);
    const cached = cache[endpoint];

    if (!cached) return null;

    // Check if cache is still valid
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      // Remove expired cache
      delete cache[endpoint];
      localStorage.setItem(API_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error('Error reading API cache:', error);
    return null;
  }
}

function setCachedResponse(endpoint: string, data: any): void {
  try {
    const cacheStr = localStorage.getItem(API_CACHE_KEY);
    const cache: Record<string, CachedResponse> = cacheStr ? JSON.parse(cacheStr) : {};

    cache[endpoint] = {
      data,
      timestamp: Date.now(),
      endpoint,
    };

    localStorage.setItem(API_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving API cache:', error);
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const method = options.method || 'GET';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // For GET requests, try cache first if offline
  if (method === 'GET' && !isOnline()) {
    const cached = getCachedResponse(endpoint);
    if (cached) {
      console.log('[API] Serving cached response (offline):', endpoint);
      return cached;
    }
    throw new Error('Offline and no cached data available');
  }

  // For non-GET requests, queue if offline
  if (method !== 'GET' && !isOnline()) {
    const requestId = addToOfflineQueue(
      endpoint,
      method,
      options.body as string,
      headers
    );
    throw new Error(`Offline: Request queued (${requestId})`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Cache GET responses
    if (method === 'GET') {
      setCachedResponse(endpoint, data);
    }

    return data;
  } catch (error) {
    // If network error and we have cache for GET requests, return cache
    if (method === 'GET' && error instanceof TypeError) {
      const cached = getCachedResponse(endpoint);
      if (cached) {
        console.log('[API] Network error, serving cached response:', endpoint);
        return cached;
      }
    }
    throw error;
  }
}

// Export function to process offline queue
export async function syncOfflineQueue(): Promise<{ success: number; failed: number }> {
  if (!isOnline()) {
    return { success: 0, failed: 0 };
  }

  return processOfflineQueue(API_BASE_URL);
}

// Category API
export const categoryAPI = {
  getAll: () => fetchAPI('/categories'),
  getById: (id: string) => fetchAPI(`/categories/${id}`),
  create: (data: { name: string; description?: string }) =>
    fetchAPI('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    fetchAPI(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/categories/${id}`, { method: 'DELETE' }),
};

// Skill API
export const skillAPI = {
  getAll: (categoryId?: string) => {
    const query = categoryId ? `?category=${categoryId}` : '';
    return fetchAPI(`/skills${query}`);
  },
  getById: (id: string) => fetchAPI(`/skills/${id}`),
  create: (data: { name: string; description?: string; category: string }) =>
    fetchAPI('/skills', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string; category?: string }) =>
    fetchAPI(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/skills/${id}`, { method: 'DELETE' }),
};

// Challenge API
export const challengeAPI = {
  getAll: (skillId?: string) => {
    const query = skillId ? `?skill=${skillId}` : '';
    return fetchAPI(`/challenges${query}`);
  },
  getById: (id: string) => fetchAPI(`/challenges/${id}`),
  create: (data: { name: string; description?: string; skill: string; xpReward?: number }) =>
    fetchAPI('/challenges', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string; skill?: string; xpReward?: number }) =>
    fetchAPI(`/challenges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/challenges/${id}`, { method: 'DELETE' }),
};

// Achievement API
export const achievementAPI = {
  getAll: (challengeId?: string) => {
    const query = challengeId ? `?challenge=${challengeId}` : '';
    return fetchAPI(`/achievements${query}`);
  },
  getById: (id: string) => fetchAPI(`/achievements/${id}`),
  create: (data: { challenge: string; notes?: string; completedAt?: string }) =>
    fetchAPI('/achievements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { notes?: string; completedAt?: string }) =>
    fetchAPI(`/achievements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/achievements/${id}`, { method: 'DELETE' }),
};

// Authentication API
export const authAPI = {
  register: (data: { name: string; email: string; password: string; avatar?: string }) =>
    fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email?: string; name?: string; password: string }) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentUser: () => fetchAPI('/auth/me'),
};

// Profile API
export const profileAPI = {
  getAll: () => fetchAPI('/profiles'),
  getById: (id: string) => fetchAPI(`/profiles/${id}`),
  create: (data: { name: string; email?: string; password: string; bio?: string; avatar?: string }) =>
    fetchAPI('/profiles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; email?: string; bio?: string; avatar?: string }) =>
    fetchAPI(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/profiles/${id}`, { method: 'DELETE' }),
};

