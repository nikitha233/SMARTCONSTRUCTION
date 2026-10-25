import { useEffect, useState } from 'react';
import { Bell, Menu, Package, RefreshCw, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { dashboardApi } from '../services/api';
import { formatDate } from '../utils/helpers';

export default function TopHeader({ title, subtitle, onMenuClick, isMenuOpen }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationData, setNotificationData] = useState(null);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!notificationsOpen) return undefined;

        const controller = new AbortController();
        queueMicrotask(() => {
            if (!controller.signal.aborted) {
                setNotificationsLoading(true);
                setNotificationsError(false);
            }
        });
        dashboardApi.get({ signal: controller.signal })
            .then(response => setNotificationData(response.data))
            .catch(() => {
                if (!controller.signal.aborted) setNotificationsError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setNotificationsLoading(false);
            });

        return () => controller.abort();
    }, [notificationsOpen, refreshKey]);

    const notifications = [
        ...(notificationData?.lowStockAlerts || []).map(item => ({
            id: `material-${item.id}`,
            title: `Low stock: ${item.name}`,
            detail: `${item.currentStock} ${item.unit} left · minimum ${item.minimumStockThreshold}`,
            to: '/materials',
            Icon: Package,
        })),
        ...(notificationData?.maintenanceAlerts || []).map(item => ({
            id: `equipment-${item.id}`,
            title: `Maintenance due: ${item.name}`,
            detail: item.nextMaintenanceDate ? `Due ${formatDate(item.nextMaintenanceDate)}` : 'Maintenance is due soon',
            to: '/equipment',
            Icon: Wrench,
        })),
    ];

    const openNotification = (path) => {
        setNotificationsOpen(false);
        navigate(path);
    };

    return (
        <header className="top-header">
            <button className="btn-icon menu-toggle" onClick={onMenuClick} aria-label="Menu" aria-expanded={isMenuOpen} aria-controls="app-sidebar">
                <Menu size={20} />
            </button>
            <div className="header-title">
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="header-actions">
                <div className="notification-wrapper">
                    <button
                        className="btn-icon"
                        aria-label="Notifications"
                        aria-expanded={notificationsOpen}
                        aria-controls="notification-menu"
                        onClick={() => setNotificationsOpen(open => !open)}
                    >
                        <Bell size={18} />
                        {notifications.length > 0 && <span className="badge">{notifications.length > 99 ? '99+' : notifications.length}</span>}
                    </button>
                    {notificationsOpen && (
                        <section className="notification-menu" id="notification-menu" aria-label="Notifications">
                            <div className="notification-header">
                                <strong>Notifications</strong>
                                <button
                                    className="btn-icon notification-refresh"
                                    type="button"
                                    aria-label="Refresh notifications"
                                    onClick={() => setRefreshKey(key => key + 1)}
                                    disabled={notificationsLoading}
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                            {notificationsLoading ? (
                                <div className="notification-status">Loading alerts…</div>
                            ) : notificationsError ? (
                                <div className="notification-status" role="alert">
                                    Could not load alerts. Use refresh to try again.
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="notification-status">You're all caught up.</div>
                            ) : (
                                <div className="notification-list">
                                    {notifications.map(({ id, title: itemTitle, detail, to, Icon }) => (
                                        <button className="notification-item" type="button" key={id} onClick={() => openNotification(to)}>
                                            <Icon size={18} aria-hidden="true" />
                                            <span>
                                                <strong>{itemTitle}</strong>
                                                <small>{detail}</small>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
                <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
