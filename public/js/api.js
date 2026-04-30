// API Base URL
const API_BASE_URL = '/api';

// دوال مساعدة للطلبات
async function request(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');

    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        // إضافة حالة الاستجابة للبيانات
        if (typeof data === 'object') {
            data._status = response.status;
        }

        if (!response.ok) {
            throw new Error(data.message || 'حدث خطأ في الطلب');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// دوال API للمصادقة
const authAPI = {
    async login(email, password) {
        return await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(email, password, fullName) {
        return await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName })
        });
    },

    async requestVerification(actionType) {
        return await request('/auth/request-verification', {
            method: 'POST',
            body: JSON.stringify({ actionType })
        });
    },

    async changePassword(currentPassword, newPassword, verificationCode) {
        return await request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword, verificationCode })
        });
    },

    // نسيت كلمة المرور
    async forgotPassword(email) {
        return await request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    // إعادة تعيين كلمة المرور
    async resetPassword(email, verificationCode, newPassword) {
        return await request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email, verificationCode, newPassword })
        });
    }
};

// دوال API للإيرادات
const revenuesAPI = {
    async getAll({ search, startDate, endDate } = {}) {
        const params = new URLSearchParams();
        if (search && search.length >= 2) params.append('search', search);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const queryString = params.toString();
        return await request(`/revenues${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return await request(`/revenues/${id}`);
    },

    async create(data) {
        return await request('/revenues', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async createBulk(items) {
        return await request('/revenues/bulk', {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    },

    async update(id, data) {
        return await request(`/revenues/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(id) {
        return await request(`/revenues/${id}`, {
            method: 'DELETE'
        });
    },

    async deleteAll(verificationCode) {
        return await request('/revenues/all', {
            method: 'DELETE',
            body: JSON.stringify({ verificationCode })
        });
    }
};

// دوال API للمصروفات
const expensesAPI = {
    async getAll({ search, startDate, endDate } = {}) {
        const params = new URLSearchParams();
        if (search && search.length >= 2) params.append('search', search);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const queryString = params.toString();
        return await request(`/expenses${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return await request(`/expenses/${id}`);
    },

    async getProjectNames() {
        return await request('/expenses/projects/names');
    },

    async create(data) {
        return await request('/expenses', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async createBulk(items) {
        return await request('/expenses/bulk', {
            method: 'POST',
            body: JSON.stringify({ items })
        });
    },

    async update(id, data) {
        return await request(`/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(id) {
        return await request(`/expenses/${id}`, {
            method: 'DELETE'
        });
    },

    async deleteAll(verificationCode) {
        return await request('/expenses/all', {
            method: 'DELETE',
            body: JSON.stringify({ verificationCode })
        });
    }
};

// دوال API للتقارير
const reportsAPI = {
    async getSummary() {
        return await request('/reports/summary');
    },

    async getProjects() {
        return await request('/reports/projects');
    },

    async getMonthlyReport() {
        return await request('/reports/monthly');
    },

    async getExpenseCategories() {
        return await request('/reports/expense-categories');
    }
};

