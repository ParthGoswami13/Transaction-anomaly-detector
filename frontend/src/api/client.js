import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT ────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('finguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ───────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('finguard_token');
      localStorage.removeItem('finguard_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ───────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  register: (data) => client.post('/auth/register', data),
  getMe: () => client.get('/auth/me'),
  getUsers: () => client.get('/auth/users'),
};

// ── Transactions API ───────────────────────────────────────
export const transactionsAPI = {
  create: (data) => client.post('/transactions', data),
  list: (params) => client.get('/transactions', { params }),
  getById: (id) => client.get(`/transactions/${id}`),
  getFlagged: (threshold) => client.get('/transactions/flagged', { params: { threshold } }),
  getStats: () => client.get('/transactions/stats'),
};

// ── Cases API ──────────────────────────────────────────────
export const casesAPI = {
  getPending: (params) => client.get('/cases/pending', { params }),
  label: (id, label) => client.patch(`/cases/${id}/label`, { label }),
  getStats: () => client.get('/cases/stats'),
};

// ── KYC API ────────────────────────────────────────────────
export const kycAPI = {
  extract: (formData) =>
    client.post('/kyc/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  manual: (data) => client.post('/kyc/manual', data),
  getStatus: () => client.get('/kyc/status'),
  verify: (id, status, rejectionReason) =>
    client.patch(`/kyc/${id}/verify`, { status, rejectionReason }),
};

// ── Admin API (admin-only endpoints) ───────────────────────
export const adminAPI = {
  getAllUsers: () => client.get('/auth/users'),
  updateRole: (id, role) => client.patch(`/auth/users/${id}/role`, { role }),
  getAllKyc: () => client.get('/kyc/all'),
};

export default client;
