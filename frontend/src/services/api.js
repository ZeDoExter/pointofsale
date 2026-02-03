import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const organizationId = localStorage.getItem('organization_id');
  const branchId = localStorage.getItem('branch_id');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (organizationId) {
    config.headers['X-Organization-ID'] = organizationId;
  }
  if (branchId) {
    config.headers['X-Branch-ID'] = branchId;
  }
  return config;
});

export const authAPI = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  validate: () => api.post('/api/auth/validate'),
  refresh: () => api.post('/api/auth/refresh'),
};

export const orderAPI = {
  list: (params) => api.get('/api/orders', { params }),
  get: (id) => api.get(`/api/orders/${id}`),
  create: (data) => api.post('/api/orders', data),
  addItem: (id, data) => api.post(`/api/orders/${id}/items`, data),
  removeItem: (orderId, itemId) => api.delete(`/api/orders/${orderId}/items/${itemId}`),
  updateStatus: (id, status) => api.put(`/api/orders/${id}/status`, { status }),
};

export const sessionAPI = {
  list: (params) => api.get('/api/qr-sessions', { params }),
  create: (tableNumber) => api.post('/api/qr-sessions', { table_number: tableNumber }),
  close: (id) => api.put(`/api/qr-sessions/${id}/close`),
};

export const promotionAPI = {
  evaluate: (code, orderTotal) => api.post('/api/promotions/evaluate', { code, order_total: orderTotal }),
  apply: (code, orderId) => api.post('/api/promotions/apply', { code, order_id: orderId }),
};

export const paymentAPI = {
  checkout: (data) => api.post('/api/payments/checkout', data),
  get: (id) => api.get(`/api/payments/${id}`),
};

export default api;
