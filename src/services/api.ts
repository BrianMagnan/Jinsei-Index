// API service for communicating with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
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

// SubSkill API
export const subSkillAPI = {
  getAll: (skillId?: string) => {
    const query = skillId ? `?skill=${skillId}` : '';
    return fetchAPI(`/subskills${query}`);
  },
  getById: (id: string) => fetchAPI(`/subskills/${id}`),
  create: (data: { name: string; description?: string; skill: string }) =>
    fetchAPI('/subskills', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string; skill?: string }) =>
    fetchAPI(`/subskills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/subskills/${id}`, { method: 'DELETE' }),
};

// Challenge API
export const challengeAPI = {
  getAll: (subSkillId?: string) => {
    const query = subSkillId ? `?subSkill=${subSkillId}` : '';
    return fetchAPI(`/challenges${query}`);
  },
  getById: (id: string) => fetchAPI(`/challenges/${id}`),
  create: (data: { name: string; description?: string; subSkill: string; xpReward?: number }) =>
    fetchAPI('/challenges', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string; subSkill?: string; xpReward?: number }) =>
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

