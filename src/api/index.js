// src/api/index.js
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/v1'

// ── Token management (user) ───────────────────────────────────────
export const getToken    = ()      => localStorage.getItem('fs_token')
export const setToken    = (token) => localStorage.setItem('fs_token', token)
export const removeToken = ()      => localStorage.removeItem('fs_token')

// ── Token management (admin — disimpan terpisah) ──────────────────
export const getAdminToken    = ()      => localStorage.getItem('fs_admin_token')
export const setAdminToken    = (token) => localStorage.setItem('fs_admin_token', token)
export const removeAdminToken = ()      => localStorage.removeItem('fs_admin_token')

// Decode JWT role tanpa library
export const getTokenRole = (token) => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role || null
  } catch { return null }
}

// ── Axios instance ────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor — tambahkan token ke setiap request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401 global
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(
      new Error(error.response?.data?.message || 'Terjadi kesalahan jaringan')
    )
  }
)

// ── Axios instance (admin) ────────────────────────────────────────
const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      removeAdminToken()
      if (!window.location.pathname.includes('/admin-login')) {
        window.location.href = '/admin-login'
      }
    }
    return Promise.reject(
      new Error(error.response?.data?.message || 'Terjadi kesalahan jaringan')
    )
  }
)

// ── Auth API ──────────────────────────────────────────────────────
export const authApi = {
  login:          (email, password) => api.post('/auth/login', { email, password }),
  register:       (data)            => api.post('/auth/register', data),
  logout:         ()                => api.post('/auth/logout'),
  getProfile:     ()                => api.get('/auth/me'),
  updateProfile:  (data)            => api.put('/auth/me', data),
}

// ── Admin Auth API ────────────────────────────────────────────────
export const adminAuthApi = {
  register:        (data)            => adminApi.post('/auth/admin-register', data),
  registerRequest: (data)            => adminApi.post('/auth/admin-register-request', data), // ← BARU
  login:           (email, password) => adminApi.post('/auth/login', { email, password }),
  getProfile:      ()                => adminApi.get('/auth/me'),
  getUsers:        ()                => adminApi.get('/auth/admin/users'),
}

// ── Super Admin API ────────────────────────────────────────────────
export const superAdminApi = {
  getRequests:    ()   => adminApi.get('/auth/superadmin/requests'),
  approveRequest: (id) => adminApi.post(`/auth/superadmin/requests/${id}/approve`),
  rejectRequest:  (id) => adminApi.post(`/auth/superadmin/requests/${id}/reject`),
  getAdmins:      ()   => adminApi.get('/auth/superadmin/admins'),
  deleteAdmin:    (id) => adminApi.delete(`/auth/superadmin/admins/${id}`),
}

// ── Transactions API ──────────────────────────────────────────────
export const transactionApi = {
  getAll:  ()         => api.get('/transactions'),
  getById: (id)       => api.get(`/transactions/${id}`),
  create:  (data)     => api.post('/transactions', data),
  update:  (id, data) => api.put(`/transactions/${id}`, data),
  delete:  (id)       => api.delete(`/transactions/${id}`),
}

// ── Budget API ────────────────────────────────────────────────────
export const budgetApi = {
  getCurrent: ()     => api.get('/budgets/current'),
  getAll:     ()     => api.get('/budgets'),
  update:     (data) => api.put('/budgets', data),
}

// ── Education / Articles API ──────────────────────────────────────
export const educationApi = {
  getArticles: (category = '') =>
    api.get(`/articles${category ? '?category=' + category : ''}`),
  getArticle:  (id) => api.get(`/articles/${id}`),
}

// ── Dashboard API ─────────────────────────────────────────────────
export const dashboardApi = {
  getSummary:   () => api.get('/dashboard/summary'),
  getChartData: () => api.get('/dashboard/chart'),
}

// ── Notifications API ─────────────────────────────────────────────
export const notifApiRemote = {
  getAll:    ()     => api.get('/notifications'),
  create:    (data) => api.post('/notifications', data),
  markRead:  (id)   => api.put(`/notifications/${id}/read`),
  readAll:   ()     => api.put('/notifications/read-all'),
  deleteAll: ()     => api.delete('/notifications'),
}

// ── Ratings API ───────────────────────────────────────────────────
export const ratingApi = {
  submit: (score, comment, aspects) => api.post('/ratings', { score, comment, aspects }),
}

// ── Simulations API ───────────────────────────────────────────────
export const simulationApi = {
  getAll: ()     => api.get('/simulations'),
  save:   (data) => api.post('/simulations', data),
  delete: (id)   => api.delete(`/simulations/${id}`),
}

export default api