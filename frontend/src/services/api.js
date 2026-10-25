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

function getReadableErrorMessage(error) {
    const data = error.response?.data;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (typeof data?.title === 'string' && data.title.trim()) return data.title;
    if (data?.errors) {
        const messages = Object.values(data.errors).flat().filter(Boolean);
        if (messages.length) return messages.join(' ');
    }
    if (!error.response) return 'The server could not be reached. Check your connection and try again.';
    if (error.response.status >= 500) return 'The server encountered an error. Please try again.';
    if (error.response.status === 404) return 'The requested item could not be found.';
    if (error.response.status === 403) return 'You do not have permission to do that.';
    if (error.response.status === 400) return 'Some of the submitted information is invalid.';
    return 'The request could not be completed. Please try again.';
}

function notifyApiError(error) {
    const message = getReadableErrorMessage(error);
    error.userMessage = message;
    error.apiToastShown = true;
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message } }));
}

// Handle authentication failures and retry transient GET network failures once.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        const cancelled = axios.isCancel(error) || error.code === 'ERR_CANCELED';
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') window.location.assign('/login');
            return Promise.reject(error);
        }

        if (!cancelled && config?.method?.toLowerCase() === 'get' && !error.response && !config.__retried) {
            config.__retried = true;
            try {
                await new Promise(resolve => setTimeout(resolve, 250));
                return await api.request(config);
            } catch (retryError) {
                if (!(axios.isCancel(retryError) || retryError.code === 'ERR_CANCELED')) notifyApiError(retryError);
                return Promise.reject(retryError);
            }
        }

        if (!cancelled) notifyApiError(error);
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
    login: (data) => api.post('/auth/login', data),
    signup: (data) => api.post('/auth/signup', data),
    me: () => api.get('/auth/me'),
    changePassword: (data) => api.post('/auth/change-password', data),
    register: (data) => api.post('/auth/register', data),
};

// ─── Dashboard ───────────────────────────────────────────────
export const dashboardApi = {
    get: (config) => api.get('/dashboard', config),
};

export const lookupApi = {
    getAll: (config) => api.get('/lookup', config),
};

// ─── Projects ────────────────────────────────────────────────
export const projectsApi = {
    getAll: (params, config = {}) => api.get('/projects', { ...config, params }),
    getById: (id, config) => api.get(`/projects/${id}`, config),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    getStages: (id, config) => api.get(`/projects/${id}/stages`, config),
    getExpenses: (id, config) => api.get(`/projects/${id}/expenses`, config),
    getProgressUpdates: (id, config) => api.get(`/projects/${id}/progress-updates`, config),
};

// ─── Stages ──────────────────────────────────────────────────
export const stagesApi = {
    getAll: (params, config = {}) => api.get('/stages', { ...config, params }),
    getById: (id, config) => api.get(`/stages/${id}`, config),
    create: (data) => api.post('/stages', data),
    update: (id, data) => api.put(`/stages/${id}`, data),
    delete: (id) => api.delete(`/stages/${id}`),
};

// ─── Materials ────────────────────────────────────────────────
export const materialsApi = {
    getAll: (params, config = {}) => api.get('/materials', { ...config, params }),
    getById: (id, config) => api.get(`/materials/${id}`, config),
    create: (data) => api.post('/materials', data),
    update: (id, data) => api.put(`/materials/${id}`, data),
    getTransactions: (id, config) => api.get(`/materials/${id}/transactions`, config),
};

export const transactionsApi = {
    getAll: (params, config = {}) => api.get('/material-transactions', { ...config, params }),
    create: (data) => api.post('/material-transactions', data),
};

// ─── Workers ─────────────────────────────────────────────────
export const workersApi = {
    getAll: (params, config = {}) => api.get('/workers', { ...config, params }),
    getById: (id, config) => api.get(`/workers/${id}`, config),
    create: (data) => api.post('/workers', data),
    update: (id, data) => api.put(`/workers/${id}`, data),
    delete: (id) => api.delete(`/workers/${id}`),
};

export const attendanceApi = {
    getAll: (params, config = {}) => api.get('/attendance', { ...config, params }),
    create: (data) => api.post('/attendance', data),
};

// ─── Equipment ───────────────────────────────────────────────
export const equipmentApi = {
    getAll: (params, config = {}) => api.get('/equipment', { ...config, params }),
    getById: (id, config) => api.get(`/equipment/${id}`, config),
    create: (data) => api.post('/equipment', data),
    update: (id, data) => api.put(`/equipment/${id}`, data),
    delete: (id) => api.delete(`/equipment/${id}`),
    getMaintenance: (id, config) => api.get(`/equipment/${id}/maintenance`, config),
    addMaintenance: (id, data) => api.post(`/equipment/${id}/maintenance`, data),
};

// ─── Expenses ────────────────────────────────────────────────
export const expensesApi = {
    getAll: (params, config = {}) => api.get('/expenses', { ...config, params }),
    getById: (id, config) => api.get(`/expenses/${id}`, config),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
};

// ─── Progress Updates ─────────────────────────────────────────
export const progressApi = {
    getAll: (params, config = {}) => api.get('/progress-updates', { ...config, params }),
    getById: (id, config) => api.get(`/progress-updates/${id}`, config),
    create: (data) => api.post('/progress-updates', data),
};

// ─── Reports ─────────────────────────────────────────────────
export const reportsApi = {
    projectSummary: (params, config = {}) => api.get('/reports/project-summary', { ...config, params }),
    inventory: (config) => api.get('/reports/inventory', config),
    expenses: (params, config = {}) => api.get('/reports/expenses', { ...config, params }),
    attendance: (params, config = {}) => api.get('/reports/attendance', { ...config, params }),
    equipmentUtilization: (config) => api.get('/reports/equipment-utilization', config),
};

export default api;
