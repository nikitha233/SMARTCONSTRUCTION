import { useState, useEffect } from 'react';
import { AuthContext } from './authContextValue';
import { authApi } from '../services/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authApi.me()
                .then(res => setUser(res.data))
                .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
                .finally(() => setLoading(false));
        }
    }, []);

    const saveSession = (res) => {
        const { token, ...userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const login = async (email, password) => saveSession(await authApi.login({ email, password }));
    const signup = async (fullName, email, password) => saveSession(await authApi.signup({ fullName, email, password }));

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const hasRole = (...roles) => user && roles.includes(user.role);
    const isAdmin = () => hasRole('Admin');
    const isAdminOrManager = () => hasRole('Admin', 'ProjectManager');

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, hasRole, isAdmin, isAdminOrManager }}>
            {children}
        </AuthContext.Provider>
    );
}
