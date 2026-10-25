import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authApi.me()
                .then(res => setUser(res.data))
                .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authApi.login({ email, password });
        const { token, ...userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const hasRole = (...roles) => user && roles.includes(user.role);
    const isAdmin = () => hasRole('Admin');
    const isAdminOrManager = () => hasRole('Admin', 'ProjectManager');

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, hasRole, isAdmin, isAdminOrManager }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
