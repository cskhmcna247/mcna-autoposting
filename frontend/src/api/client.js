import axios from 'axios'
import { TOKEN_KEY } from '../contexts/AuthContext'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const dashboard = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
  recent: (limit = 10) => api.get(`/dashboard/recent?limit=${limit}`).then(r => r.data),
}

export const posts = {
  list: (params = {}) => api.get('/posts', { params }).then(r => r.data),
  get: (id) => api.get(`/posts/${id}`).then(r => r.data),
  create: (data) => api.post('/posts', data).then(r => r.data),
  update: (id, data) => api.put(`/posts/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/posts/${id}`).then(r => r.data),
  approve: (id) => api.post(`/posts/${id}/approve`).then(r => r.data),
  reject: (id) => api.post(`/posts/${id}/reject`).then(r => r.data),
  calendar: (start, end) => api.get('/posts/calendar', { params: { start, end } }).then(r => r.data),
  uploadImages: (files) => {
    const form = new FormData()
    for (const file of files) {
      form.append('files', file)
    }
    return api.post('/posts/upload-images', form).then(r => r.data)
  },
}

export const workflow = {
  run: () => api.post('/workflow/run').then(r => r.data),
  status: () => api.get('/workflow/status').then(r => r.data),
  logs: () => api.get('/workflow/logs').then(r => r.data),
  getSchedule: () => api.get('/workflow/schedule').then(r => r.data),
  setSchedule: (minutes) => api.post(`/workflow/schedule?interval_minutes=${minutes}`).then(r => r.data),
  removeSchedule: () => api.delete('/workflow/schedule').then(r => r.data),
}

export const platforms = {
  status: () => api.get('/platforms/status').then(r => r.data),
  verifyFacebook: () => api.post('/platforms/facebook/verify').then(r => r.data),
  verifyLinkedin: () => api.post('/platforms/linkedin/verify').then(r => r.data),
  wordpressCategories: () => api.get('/platforms/wordpress/categories').then(r => r.data),
}

export const settings = {
  get: () => api.get('/settings').then(r => r.data),
}

export const users = {
  list: () => api.get('/auth/users').then(r => r.data),
  create: (data) => api.post('/auth/users', data).then(r => r.data),
  updateRole: (id, role) => api.put(`/auth/users/${id}/role`, { role }).then(r => r.data),
  delete: (id) => api.delete(`/auth/users/${id}`).then(r => r.data),
}
