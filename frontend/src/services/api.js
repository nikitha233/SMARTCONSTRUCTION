import axios from 'axios';

const API_BASE = 'http://localhost:5259/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
    changePassword: (data) => api.post('/auth/change-password', data),
    register: (data) => api.post('/auth/register', data),
};

// ─── Dashboard ───────────────────────────────────────────────
export const dashboardApi = {
    get: () => api.get('/dashboard'),
};

// ─── Projects ────────────────────────────────────────────────
export const projectsApi = {
    getAll: (params) => api.get('/projects', { params }),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    getStages: (id) => api.get(`/projects/${id}/stages`),
    getExpenses: (id) => api.get(`/projects/${id}/expenses`),
    getProgressUpdates: (id) => api.get(`/projects/${id}/progress-updates`),
};

// ─── Stages ──────────────────────────────────────────────────
export const stagesApi = {
    getAll: (params) => api.get('/stages', { params }),
    getById: (id) => api.get(`/stages/${id}`),
    create: (data) => api.post('/stages', data),
    update: (id, data) => api.put(`/stages/${id}`, data),
    delete: (id) => api.delete(`/stages/${id}`),
};

// ─── Materials ────────────────────────────────────────────────
export const materialsApi = {
    getAll: (params) => api.get('/materials', { params }),
    getById: (id) => api.get(`/materials/${id}`),
    create: (data) => api.post('/materials', data),
    update: (id, data) => api.put(`/materials/${id}`, data),
    getTransactions: (id) => api.get(`/materials/${id}/transactions`),
};

export const transactionsApi = {
    getAll: (params) => api.get('/material-transactions', { params }),
    create: (data) => api.post('/material-transactions', data),
};

// ─── Workers ─────────────────────────────────────────────────
export const workersApi = {
    getAll: (params) => api.get('/workers', { params }),
    getById: (id) => api.get(`/workers/${id}`),
    create: (data) => api.post('/workers', data),
    update: (id, data) => api.put(`/workers/${id}`, data),
    delete: (id) => api.delete(`/workers/${id}`),
};

export const attendanceApi = {
    getAll: (params) => api.get('/attendance', { params }),
    create: (data) => api.post('/attendance', data),
};

// ─── Equipment ───────────────────────────────────────────────
export const equipmentApi = {
    getAll: (params) => api.get('/equipment', { params }),
    getById: (id) => api.get(`/equipment/${id}`),
    create: (data) => api.post('/equipment', data),
    update: (id, data) => api.put(`/equipment/${id}`, data),
    delete: (id) => api.delete(`/equipment/${id}`),
    getMaintenance: (id) => api.get(`/equipment/${id}/maintenance`),
    addMaintenance: (id, data) => api.post(`/equipment/${id}/maintenance`, data),
};

// ─── Expenses ────────────────────────────────────────────────
export const expensesApi = {
    getAll: (params) => api.get('/expenses', { params }),
    getById: (id) => api.get(`/expenses/${id}`),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
};

// ─── Progress Updates ─────────────────────────────────────────
export const progressApi = {
    getAll: (params) => api.get('/progress-updates', { params }),
    getById: (id) => api.get(`/progress-updates/${id}`),
    create: (data) => api.post('/progress-updates', data),
};

// ─── Reports ─────────────────────────────────────────────────
export const reportsApi = {
    projectSummary: (params) => api.get('/reports/project-summary', { params }),
    inventory: () => api.get('/reports/inventory'),
    expenses: (params) => api.get('/reports/expenses', { params }),
    attendance: (params) => api.get('/reports/attendance', { params }),
    equipmentUtilization: () => api.get('/reports/equipment-utilization'),
};

export default api;
