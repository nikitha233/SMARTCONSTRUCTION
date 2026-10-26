import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { authApi } from '../services/api';
import { PageHeader } from '../components/UI';
import {
    User, Lock, Bell, Sliders, Shield, CheckCircle2, AlertTriangle,
    Eye, EyeOff, Save, Check, LogOut, Building2, Package, Wrench, DollarSign
} from 'lucide-react';

const ROLE_PERMISSIONS = {
    Admin: [
        'Full administrative access across all modules',
        'Review and accept/reject new user registration requests',
        'Manage staff accounts, assign and modify user roles',
        'Financial oversight: view all project budgets and expense logs',
        'Manage warehouse materials, stock in/out, and reorders',
        'Equipment procurement, tracking, and maintenance logs',
        'Generate executive analytics and comprehensive reports'
    ],
    ProjectManager: [
        'Create and manage construction projects and phases',
        'Define construction stages and track real-time milestones',
        'Review daily progress updates submitted by site engineers',
        'Manage workforce, workers directory, and daily attendance',
        'Monitor project expenditures, budgets, and cost variances',
        'Assign machinery and equipment to active projects',
        'Export stage and milestone progress reports'
    ],
    SiteEngineer: [
        'View assigned construction projects and blueprints',
        'Log daily site progress updates with stage progress %',
        'Record daily worker attendance and check-in logs',
        'Submit site material requisition requests to store manager',
        'Record on-site equipment maintenance and breakdown logs',
        'Log day-to-day site expenses and vendor receipts'
    ],
    StoreManager: [
        'Manage central warehouse materials catalog and inventory',
        'Record inward stock deliveries (Stock In)',
        'Issue and dispatch materials to construction projects (Stock Out)',
        'Review and fulfill site engineer material requisitions',
        'Track purchase orders (POs) and delivery fulfillment',
        'Monitor safety stock thresholds and execute deficit restocks',
        'Maintain approved suppliers directory and lead times'
    ]
};

export default function Settings() {
    const { user, logout } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('profile');

    // Password change form state
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdLoading, setPwdLoading] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);

    // Notification preferences state
    const [notifSettings, setNotifSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('buildsmart_notif_prefs');
            return saved ? JSON.parse(saved) : {
                inAppAlerts: true,
                soundAlerts: false,
                emailDigest: true,
                lowStockAlerts: true,
                budgetWarnings: true,
                maintenanceReminders: true,
                userRequestsAlerts: true,
                materialDispatchAlerts: true
            };
        } catch {
            return {
                inAppAlerts: true,
                soundAlerts: false,
                emailDigest: true,
                lowStockAlerts: true,
                budgetWarnings: true,
                maintenanceReminders: true,
                userRequestsAlerts: true,
                materialDispatchAlerts: true
            };
        }
    });

    // Display & Regional preferences
    const [displayPrefs, setDisplayPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem('buildsmart_display_prefs');
            return saved ? JSON.parse(saved) : {
                currency: 'INR',
                dateFormat: 'DD/MM/YYYY',
                tableDensity: 'normal',
                theme: 'light'
            };
        } catch {
            return {
                currency: 'INR',
                dateFormat: 'DD/MM/YYYY',
                tableDensity: 'normal',
                theme: 'light'
            };
        }
    });

    const handleSaveNotifPrefs = () => {
        try {
            localStorage.setItem('buildsmart_notif_prefs', JSON.stringify(notifSettings));
            toast.success('Notification & alert preferences saved.');
        } catch {
            toast.error('Failed to save preferences.');
        }
    };

    const handleSaveDisplayPrefs = () => {
        try {
            localStorage.setItem('buildsmart_display_prefs', JSON.stringify(displayPrefs));
            toast.success('Display and regional preferences updated.');
        } catch {
            toast.error('Failed to save preferences.');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (!pwdForm.currentPassword) {
            toast.error('Please enter your current password.');
            return;
        }
        if (pwdForm.newPassword.length < 8) {
            toast.error('New password must be at least 8 characters long.');
            return;
        }
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            toast.error('New passwords do not match.');
            return;
        }

        setPwdLoading(true);
        try {
            await authApi.changePassword({
                currentPassword: pwdForm.currentPassword,
                newPassword: pwdForm.newPassword
            });
            toast.success('Password changed successfully!');
            setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const errors = err.response?.data?.errors;
            const message = Array.isArray(errors) ? errors.join(' ') : err.response?.data?.message || 'Failed to change password.';
            toast.error(message);
        } finally {
            setPwdLoading(false);
        }
    };

    const rolePermissions = ROLE_PERMISSIONS[user?.role] || ROLE_PERMISSIONS.SiteEngineer;

    return (
        <div>
            <PageHeader
                title="Settings & System Preferences"
                subtitle="Configure account security, role-based alert rules, and personal display options"
            />

            {/* Horizontal Settings Tabs */}
            <div style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid var(--border)',
                marginBottom: 24,
                overflowX: 'auto',
                paddingBottom: 4
            }}>
                {[
                    { id: 'profile', label: 'Profile & Account', icon: User },
                    { id: 'security', label: 'Security & Password', icon: Lock },
                    { id: 'alerts', label: 'Notifications & Alerts', icon: Bell },
                    { id: 'display', label: 'Display & Regional', icon: Sliders },
                    { id: 'permissions', label: 'Role Permissions', icon: Shield },
                ].map(tab => {
                    const active = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 16px',
                                border: 'none',
                                borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
                                background: active ? 'rgba(26, 71, 49, 0.06)' : 'transparent',
                                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: active ? 700 : 500,
                                fontSize: 13.5,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                borderRadius: '8px 8px 0 0'
                            }}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: PROFILE & ACCOUNT */}
            {activeTab === 'profile' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Account Profile</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20,
                                fontWeight: 800
                            }}>
                                {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{user?.fullName}</h4>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
                                <span style={{
                                    display: 'inline-block',
                                    marginTop: 4,
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    padding: '2px 8px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700
                                }}>
                                    {user?.role}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>User ID</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{user?.userId || user?.id || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Assigned Role</span>
                                <strong>{user?.role}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Account Status</span>
                                <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={14} /> Active & Verified
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Role Summary</h3>
                        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                            Your assigned privileges as a <strong>{user?.role}</strong> in the BuildSmart system:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {rolePermissions.slice(0, 4).map((perm, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5 }}>
                                    <Check size={14} color="#16a34a" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <span>{perm}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: 16 }}
                            onClick={() => setActiveTab('permissions')}
                        >
                            View All {user?.role} Permissions →
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
                <div className="card" style={{ maxWidth: 540, padding: 24 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Change Account Password</h3>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                        Ensure your account uses a secure password of at least 8 characters with numbers and symbols.
                    </p>

                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Current Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showCurrentPwd ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="Enter current password"
                                    value={pwdForm.currentPassword}
                                    onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPwd(p => !p)}
                                    style={{
                                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                    }}
                                >
                                    {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showNewPwd ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="Minimum 8 characters"
                                    value={pwdForm.newPassword}
                                    onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPwd(p => !p)}
                                    style={{
                                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                                    }}
                                >
                                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm New Password *</label>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Re-enter new password"
                                value={pwdForm.confirmPassword}
                                onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                required
                            />
                        </div>

                        <div style={{ marginTop: 8 }}>
                            <button className="btn btn-primary" type="submit" disabled={pwdLoading}>
                                <Lock size={15} /> {pwdLoading ? 'Updating Password…' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 3: NOTIFICATIONS & ALERTS */}
            {activeTab === 'alerts' && (
                <div style={{ maxWidth: 680 }}>
                    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Real-Time Alert Channels</h3>
                        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>
                            Choose how BuildSmart notifies you about critical site events and updates.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <strong style={{ fontSize: 13.5 }}>In-App Header Notification Bell</strong>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show real-time badge count and alert dropdown in top header bar</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifSettings.inAppAlerts}
                                    onChange={e => setNotifSettings(s => ({ ...s, inAppAlerts: e.target.checked }))}
                                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />
                            </label>

                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <strong style={{ fontSize: 13.5 }}>Audio Notification Chimes</strong>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Play subtle sound when high-priority critical alerts trigger</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifSettings.soundAlerts}
                                    onChange={e => setNotifSettings(s => ({ ...s, soundAlerts: e.target.checked }))}
                                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />
                            </label>

                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                <div>
                                    <strong style={{ fontSize: 13.5 }}>Daily Site Summary Digest</strong>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send end-of-day project progress and resource status summary</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifSettings.emailDigest}
                                    onChange={e => setNotifSettings(s => ({ ...s, emailDigest: e.target.checked }))}
                                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Role-Specific Trigger Rules</h3>
                        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>
                            Customize trigger thresholds for your role (<strong>{user?.role}</strong>).
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {user?.role === 'Admin' && (
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <strong style={{ fontSize: 13.5 }}>New User Account Registration Requests</strong>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alert immediately when a new user signs up and waits for Admin acceptance</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={notifSettings.userRequestsAlerts}
                                        onChange={e => setNotifSettings(s => ({ ...s, userRequestsAlerts: e.target.checked }))}
                                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                </label>
                            )}

                            {(user?.role === 'Admin' || user?.role === 'ProjectManager') && (
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <strong style={{ fontSize: 13.5 }}>Project Budget Overrun Warnings (&gt;80% Spend)</strong>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alert when project expenditures reach or exceed 80% of allocated budget</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={notifSettings.budgetWarnings}
                                        onChange={e => setNotifSettings(s => ({ ...s, budgetWarnings: e.target.checked }))}
                                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                </label>
                            )}

                            {(user?.role === 'Admin' || user?.role === 'StoreManager') && (
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <strong style={{ fontSize: 13.5 }}>Warehouse Safety Stock Depletion Alerts</strong>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alert when any material drops below its minimum safety reorder threshold</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={notifSettings.lowStockAlerts}
                                        onChange={e => setNotifSettings(s => ({ ...s, lowStockAlerts: e.target.checked }))}
                                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                    />
                                </label>
                            )}

                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                <div>
                                    <strong style={{ fontSize: 13.5 }}>Machinery & Equipment Service Reminders</strong>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alert when heavy equipment or vehicles reach scheduled maintenance dates</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifSettings.maintenanceReminders}
                                    onChange={e => setNotifSettings(s => ({ ...s, maintenanceReminders: e.target.checked }))}
                                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />
                            </label>
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={handleSaveNotifPrefs}>
                        <Save size={15} /> Save Notification Preferences
                    </button>
                </div>
            )}

            {/* TAB 4: DISPLAY & REGIONAL */}
            {activeTab === 'display' && (
                <div className="card" style={{ maxWidth: 540, padding: 24 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Regional & Display Formatting</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Currency Symbol</label>
                            <select
                                className="form-control"
                                value={displayPrefs.currency}
                                onChange={e => setDisplayPrefs(d => ({ ...d, currency: e.target.value }))}
                            >
                                <option value="INR">INR (₹) — Indian Rupee</option>
                                <option value="USD">USD ($) — US Dollar</option>
                                <option value="EUR">EUR (€) — Euro</option>
                                <option value="GBP">GBP (£) — British Pound</option>
                                <option value="AED">AED (د.إ) — UAE Dirham</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date Format</label>
                            <select
                                className="form-control"
                                value={displayPrefs.dateFormat}
                                onChange={e => setDisplayPrefs(d => ({ ...d, dateFormat: e.target.value }))}
                            >
                                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 26/10/2026)</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-26)</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/26/2026)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Table Density</label>
                            <select
                                className="form-control"
                                value={displayPrefs.tableDensity}
                                onChange={e => setDisplayPrefs(d => ({ ...d, tableDensity: e.target.value }))}
                            >
                                <option value="normal">Comfortable (Standard)</option>
                                <option value="compact">Compact (High Information Density)</option>
                            </select>
                        </div>

                        <div style={{ marginTop: 8 }}>
                            <button className="btn btn-primary" onClick={handleSaveDisplayPrefs}>
                                <Save size={15} /> Save Regional Preferences
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: ROLE PERMISSIONS BREAKDOWN */}
            {activeTab === 'permissions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 740 }}>
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <Shield size={20} color="var(--primary)" />
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                System Privileges for: <span style={{ color: 'var(--primary)' }}>{user?.role}</span>
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {rolePermissions.map((perm, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-page)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                                    <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                                    <span>{perm}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
