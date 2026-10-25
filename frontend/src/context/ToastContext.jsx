import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { ToastContext } from './toastContextValue';

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const recentApiToastAt = useRef(0);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    useEffect(() => {
        const onApiToast = (event) => {
            const { message, type = 'error' } = event.detail || {};
            if (message) {
                recentApiToastAt.current = Date.now();
                addToast(message, type);
            }
        };
        window.addEventListener('app:toast', onApiToast);
        return () => window.removeEventListener('app:toast', onApiToast);
    }, [addToast]);

    const toast = useMemo(() => ({
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => {
            if (Date.now() - recentApiToastAt.current > 500) addToast(msg, 'error');
        },
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
    }), [addToast]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
