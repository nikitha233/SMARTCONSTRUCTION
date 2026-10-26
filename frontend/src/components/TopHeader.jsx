import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Bell, Menu, Package, RefreshCw, Wrench, Settings, UserCheck,
    DollarSign, AlertTriangle, Check, CheckCircle2, ClipboardList, Clock, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { dashboardApi, authApi, materialsApi } from '../services/api';
import { formatDate, formatCurrency } from '../utils/helpers';

export default function TopHeader({ title, subtitle, onMenuClick, isMenuOpen }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationData, setNotificationData] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [siteRequests, setSiteRequests] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'alerts' | 'requests'

    // Persistent read notifications tracking
    const [readIds, setReadIds] = useState(() => {
        try {
            const saved = localStorage.getItem('buildsmart_read_notifications');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const loadNotifications = useCallback(async (signal) => {
        setNotificationsLoading(true);
        setNotificationsError(false);
        try {
            // Load dashboard data for stock & maintenance & budget
            const dashRes = await dashboardApi.get({ signal });
            setNotificationData(dashRes.data);

            // If Admin, also load pending user registration requests
            if (user?.role === 'Admin') {
                try {
                    const usersRes = await authApi.getUsers({ signal });
                    const unapproved = (usersRes.data || []).filter(u => !u.isActive);
                    setPendingUsers(unapproved);
                } catch {
                    // ignore if unauthorized
                }
            }

            // Load site requests from localStorage
            try {
                const reqs = JSON.parse(localStorage.getItem('buildsmart_material_requests') || '[]');
                setSiteRequests(reqs);
            } catch {}

        } catch (err) {
            if (!signal?.aborted) setNotificationsError(true);
        } finally {
            if (!signal?.aborted) setNotificationsLoading(false);
        }
    }, [user]);

    // Eagerly load on mount and when refreshKey changes
    useEffect(() => {
        const controller = new AbortController();
        loadNotifications(controller.signal);
        // Refresh every 35 seconds
        const interval = setInterval(() => loadNotifications(controller.signal), 35000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [loadNotifications, refreshKey]);

    // Build role-specific notifications
    const allNotifications = useMemo(() => {
        const list = [];

        // 1. ADMIN ONLY: Pending user account requests
        if (user?.role === 'Admin' && pendingUsers.length > 0) {
            pendingUsers.forEach(u => {
                list.push({
                    id: `user-req-${u.id}`,
                    category: 'requests',
                    type: 'critical',
                    title: `Account Request: ${u.fullName}`,
                    detail: `${u.email} requested ${u.role} access — Pending Admin Acceptance`,
                    date: u.createdAt ? formatDate(u.createdAt) : 'Recent',
                    to: '/user-access',
                    Icon: UserCheck,
                    badge: 'Approval Needed',
                    badgeColor: '#dc2626'
                });
            });
        }

        // 2. STORE MANAGER & ADMIN: Low stock alerts
        if (['Admin', 'StoreManager', 'ProjectManager'].includes(user?.role)) {
            (notificationData?.lowStockAlerts || []).forEach(m => {
                list.push({
                    id: `material-low-${m.id}`,
                    category: 'alerts',
                    type: 'warning',
                    title: `Low Stock: ${m.name}`,
                    detail: `Only ${m.currentStock} ${m.unit} in stock (Min safety: ${m.minimumStockThreshold})`,
                    date: 'Immediate action',
                    to: '/materials?tab=alerts',
                    Icon: Package,
                    badge: 'Reorder Deficit',
                    badgeColor: '#d97706'
                });
            });
        }

        // 3. PROJECT MANAGER & ADMIN: Budget overruns (>80% spend)
        if (['Admin', 'ProjectManager'].includes(user?.role)) {
            (notificationData?.recentProjects || []).forEach(p => {
                if (p.estimatedBudget > 0 && p.actualCost > 0.8 * p.estimatedBudget) {
                    const pct = Math.round((p.actualCost / p.estimatedBudget) * 100);
                    list.push({
                        id: `budget-warn-${p.id}`,
                        category: 'alerts',
                        type: pct > 100 ? 'critical' : 'warning',
                        title: `Budget Alert: ${p.name}`,
                        detail: `${pct}% budget utilized (${formatCurrency(p.actualCost)} of ${formatCurrency(p.estimatedBudget)})`,
                        date: 'Financial',
                        to: '/budget',
                        Icon: DollarSign,
                        badge: pct > 100 ? 'Over Budget' : '>80% Spent',
                        badgeColor: pct > 100 ? '#dc2626' : '#ea580c'
                    });
                }
            });
        }

        // 4. ALL ROLES: Equipment maintenance alerts
        (notificationData?.maintenanceAlerts || []).forEach(eq => {
            list.push({
                id: `eq-maint-${eq.id}`,
                category: 'alerts',
                type: 'warning',
                title: `Maintenance Due: ${eq.name}`,
                detail: eq.nextMaintenanceDate ? `Scheduled for ${formatDate(eq.nextMaintenanceDate)}` : 'Routine service required',
                date: 'Maintenance',
                to: '/equipment',
                Icon: Wrench,
                badge: 'Service Due',
                badgeColor: '#d97706'
            });
        });

        // 5. SITE ENGINEER & STORE MANAGER: Material requisitions
        if (user?.role === 'SiteEngineer') {
            siteRequests.filter(r => r.status === 'Approved' || r.status === 'Fulfilled').slice(0, 3).forEach(r => {
                list.push({
                    id: `site-req-${r.id}`,
                    category: 'requests',
                    type: 'success',
                    title: `Request ${r.status}: ${r.materialName}`,
                    detail: `${r.quantity} ${r.unit} allocated to ${r.projectName}`,
                    date: formatDate(r.date),
                    to: '/materials?tab=requests',
                    Icon: CheckCircle2,
                    badge: r.status,
                    badgeColor: '#16a34a'
                });
            });
        } else if (user?.role === 'StoreManager' || user?.role === 'Admin') {
            siteRequests.filter(r => r.status === 'Pending').slice(0, 3).forEach(r => {
                list.push({
                    id: `store-req-${r.id}`,
                    category: 'requests',
                    type: 'warning',
                    title: `New Requisition: ${r.materialName}`,
                    detail: `${r.quantity} ${r.unit} requested by ${r.requestedBy} (${r.urgency} priority)`,
                    date: formatDate(r.date),
                    to: '/materials?tab=requests',
                    Icon: ClipboardList,
                    badge: `${r.urgency} Request`,
                    badgeColor: r.urgency === 'Urgent' ? '#dc2626' : '#d97706'
                });
            });
        }

        return list;
    }, [user, pendingUsers, notificationData, siteRequests]);

    // Unread count (excluding read IDs)
    const unreadCount = useMemo(() => {
        return allNotifications.filter(n => !readIds.includes(n.id)).length;
    }, [allNotifications, readIds]);

    const markAllAsRead = () => {
        const allIds = allNotifications.map(n => n.id);
        const updated = Array.from(new Set([...readIds, ...allIds]));
        setReadIds(updated);
        try {
            localStorage.setItem('buildsmart_read_notifications', JSON.stringify(updated));
        } catch {}
    };

    const handleNotificationClick = (item) => {
        if (!readIds.includes(item.id)) {
            const updated = [...readIds, item.id];
            setReadIds(updated);
            try {
                localStorage.setItem('buildsmart_read_notifications', JSON.stringify(updated));
            } catch {}
        }
        setNotificationsOpen(false);
        navigate(item.to);
    };

    // Filtered list by active tab
    const filteredNotifications = useMemo(() => {
        if (filterTab === 'alerts') return allNotifications.filter(n => n.category === 'alerts');
        if (filterTab === 'requests') return allNotifications.filter(n => n.category === 'requests');
        return allNotifications;
    }, [allNotifications, filterTab]);

    return (
        <header className="top-header">
            <button className="btn-icon menu-toggle" onClick={onMenuClick} aria-label="Menu" aria-expanded={isMenuOpen} aria-controls="app-sidebar">
                <Menu size={20} />
            </button>
            <div className="header-title">
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* NOTIFICATION & ALERT CENTER */}
                <div className="notification-wrapper">
                    <button
                        className="btn-icon"
                        aria-label="Notifications"
                        aria-expanded={notificationsOpen}
                        aria-controls="notification-menu"
                        onClick={() => setNotificationsOpen(open => !open)}
                        title="Notifications & Alerts"
                        style={{ position: 'relative' }}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span
                                className="badge"
                                style={{
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: 10,
                                    minWidth: 18,
                                    height: 18,
                                    padding: '0 4px',
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    boxShadow: '0 0 0 2px var(--bg-card)'
                                }}
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <section
                            className="notification-menu"
                            id="notification-menu"
                            aria-label="Notifications"
                            style={{
                                width: 380,
                                maxWidth: 'calc(100vw - 20px)',
                                borderRadius: 12,
                                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Header */}
                            <div className="notification-header" style={{ padding: '12px 16px', background: 'var(--bg-card)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong style={{ fontSize: 14 }}>Notifications & Alerts</strong>
                                    {unreadCount > 0 && (
                                        <span style={{
                                            background: '#fee2e2',
                                            color: '#dc2626',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            padding: '1px 6px',
                                            borderRadius: 8
                                        }}>
                                            {unreadCount} New
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={markAllAsRead}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--primary)',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: '2px 6px'
                                            }}
                                            title="Mark all as read"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                    <button
                                        className="btn-icon notification-refresh"
                                        type="button"
                                        aria-label="Refresh notifications"
                                        onClick={() => setRefreshKey(key => key + 1)}
                                        disabled={notificationsLoading}
                                        style={{ width: 28, height: 28 }}
                                    >
                                        <RefreshCw size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div style={{
                                display: 'flex',
                                gap: 6,
                                padding: '8px 14px',
                                background: 'var(--bg-page)',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                {[
                                    { id: 'all', label: `All (${allNotifications.length})` },
                                    { id: 'alerts', label: `Alerts (${allNotifications.filter(n => n.category === 'alerts').length})` },
                                    { id: 'requests', label: `Requests (${allNotifications.filter(n => n.category === 'requests').length})` },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setFilterTab(tab.id)}
                                        style={{
                                            border: 'none',
                                            background: filterTab === tab.id ? 'var(--primary)' : 'transparent',
                                            color: filterTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                                            fontSize: 11,
                                            fontWeight: filterTab === tab.id ? 700 : 500,
                                            padding: '3px 9px',
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Notifications List */}
                            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {notificationsLoading && allNotifications.length === 0 ? (
                                    <div className="notification-status">Checking for system alerts…</div>
                                ) : notificationsError ? (
                                    <div className="notification-status" role="alert">
                                        Could not load live alerts. Click refresh to retry.
                                    </div>
                                ) : filteredNotifications.length === 0 ? (
                                    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>You're all caught up!</div>
                                        <div style={{ fontSize: 12, marginTop: 2 }}>No active alerts or pending requests for your role.</div>
                                    </div>
                                ) : (
                                    <div className="notification-list">
                                        {filteredNotifications.map((item) => {
                                            const isRead = readIds.includes(item.id);
                                            const IconComponent = item.Icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    className="notification-item"
                                                    type="button"
                                                    onClick={() => handleNotificationClick(item)}
                                                    style={{
                                                        background: isRead ? 'var(--bg-card)' : 'rgba(82, 183, 136, 0.08)',
                                                        borderLeft: isRead ? '3px solid transparent' : '3px solid var(--primary)',
                                                        padding: '11px 14px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 8,
                                                        background: item.type === 'critical' ? '#fee2e2' : item.type === 'success' ? '#dcfce7' : '#fef3c7',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <IconComponent
                                                            size={16}
                                                            color={item.type === 'critical' ? '#dc2626' : item.type === 'success' ? '#16a34a' : '#d97706'}
                                                        />
                                                    </div>
                                                    <span style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                                            <strong style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {item.title}
                                                            </strong>
                                                            {item.badge && (
                                                                <span style={{
                                                                    fontSize: 9.5,
                                                                    fontWeight: 700,
                                                                    background: item.badgeColor ? `${item.badgeColor}15` : '#fee2e2',
                                                                    color: item.badgeColor || '#dc2626',
                                                                    padding: '1px 5px',
                                                                    borderRadius: 4,
                                                                    flexShrink: 0
                                                                }}>
                                                                    {item.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <small style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                                                            {item.detail}
                                                        </small>
                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                                            {item.date}
                                                        </div>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Footer */}
                            <div style={{
                                padding: '10px 14px',
                                background: 'var(--bg-page)',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 11.5
                            }}>
                                <span style={{ color: 'var(--text-muted)' }}>Role: <strong>{user?.role}</strong></span>
                                <button
                                    type="button"
                                    onClick={() => { setNotificationsOpen(false); navigate('/settings'); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        fontWeight: 600,
                                        fontSize: 11.5,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                >
                                    <Settings size={12} /> Alert Settings
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* SETTINGS SHORTCUT BUTTON IN HEADER */}
                <button
                    className="btn-icon"
                    onClick={() => navigate('/settings')}
                    title="Settings & System Preferences"
                    aria-label="Settings"
                >
                    <Settings size={18} />
                </button>

                {/* USER PROFILE IN HEADER */}
                <div
                    className="header-user-info"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        fontSize: 13,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 8
                    }}
                    onClick={() => navigate('/settings')}
                    title="View Profile & Settings"
                >
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{user?.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
                    </div>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                    </div>
                </div>
            </div>
        </header>
    );
}
