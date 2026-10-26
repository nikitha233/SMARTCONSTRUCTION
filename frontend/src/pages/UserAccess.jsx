import { useCallback, useEffect, useState } from 'react';
import { authApi } from '../services/api';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import { DataTable, PageHeader, SkeletonLoader } from '../components/UI';
import { formatDate } from '../utils/helpers';
import { Trash2, UserPlus, UserRoundCog, Check, X, Clock, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';

const ROLES = [
    { value: 'ProjectManager', label: 'Project Manager' },
    { value: 'SiteEngineer', label: 'Site Engineer' },
    { value: 'StoreManager', label: 'Store Manager' },
    { value: 'Admin', label: 'Administrator' },
];

const ROLE_ACCESS = {
    Admin: 'Full access, including creating user accounts and accepting registration requests.',
    ProjectManager: 'Manage projects, stages, workers, equipment, expenses, and attendance; view dashboards and reports.',
    SiteEngineer: 'View projects; update stages and progress; record attendance and expenses; add equipment maintenance.',
    StoreManager: 'Manage materials and stock transactions.',
};

const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'SiteEngineer' };

export default function UserAccess() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [savingUserId, setSavingUserId] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const toast = useToast();
    const { user: currentUser } = useAuth();
    const currentUserId = currentUser?.userId ?? currentUser?.id;

    const loadUsers = useCallback(async () => {
        try {
            const response = await authApi.getUsers();
            setUsers(response.data);
        } catch (error) {
            toast.error(error.userMessage || 'Could not load user accounts.');
        }
    }, [toast]);

    useEffect(() => {
        let isCurrent = true;
        authApi.getUsers()
            .then(response => {
                if (isCurrent) setUsers(response.data);
            })
            .catch(error => {
                if (isCurrent) toast.error(error.userMessage || 'Could not load user accounts.');
            })
            .finally(() => {
                if (isCurrent) setLoadingUsers(false);
            });
        return () => {
            isCurrent = false;
        };
    }, [toast]);

    const updateForm = (event) => {
        const { name, value } = event.target;
        setForm(current => ({ ...current, [name]: value }));
    };

    const createUser = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await authApi.register({
                ...form,
                fullName: form.fullName.trim(),
                email: form.email.trim(),
            });
            toast.success(`Account for ${form.fullName} created successfully.`);
            setForm(EMPTY_FORM);
            setShowCreateForm(false);
            await loadUsers();
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = Array.isArray(errors) ? errors.join(' ') : error.userMessage;
            toast.error(message || 'Could not create the account.');
        } finally {
            setSaving(false);
        }
    };

    const approveUser = async (user) => {
        setSavingUserId(user.id);
        try {
            await authApi.approveUser(user.id);
            toast.success(`✓ Account accepted! ${user.fullName} can now sign in.`);
            await loadUsers();
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = Array.isArray(errors) ? errors.join(' ') : error.response?.data?.message || error.userMessage;
            toast.error(message || 'Could not approve account.');
        } finally {
            setSavingUserId(null);
        }
    };

    const rejectUser = async (user) => {
        if (!window.confirm(`Reject and delete account request for ${user.fullName} (${user.email})?`)) return;
        setSavingUserId(user.id);
        try {
            await authApi.rejectUser(user.id);
            toast.success(`Account request from ${user.fullName} rejected.`);
            await loadUsers();
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = Array.isArray(errors) ? errors.join(' ') : error.response?.data?.message || error.userMessage;
            toast.error(message || 'Could not reject request.');
        } finally {
            setSavingUserId(null);
        }
    };

    const updateUser = async (user, values) => {
        setSavingUserId(user.id);
        try {
            await authApi.updateUserAccess(user.id, {
                role: values.role ?? user.role,
                isActive: values.isActive ?? user.isActive,
            });
            toast.success('User access updated.');
            await loadUsers();
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = Array.isArray(errors) ? errors.join(' ') : error.userMessage;
            toast.error(message || 'Could not update user access.');
        } finally {
            setSavingUserId(null);
        }
    };

    const deleteUser = async (user) => {
        if (!window.confirm(`Permanently delete ${user.fullName} (${user.email})?`)) return;
        setSavingUserId(user.id);
        try {
            await authApi.deleteUser(user.id);
            toast.success('User account deleted.');
            await loadUsers();
        } catch (error) {
            const errors = error.response?.data?.errors;
            const message = Array.isArray(errors) ? errors.join(' ') : error.userMessage;
            toast.error(message || 'Could not delete the account.');
        } finally {
            setSavingUserId(null);
        }
    };

    const pendingRequests = users.filter(u => !u.isActive);
    const activeAccounts = users.filter(u => u.isActive);

    return (
        <div>
            <PageHeader
                title="User Access & Account Approvals"
                subtitle="Review and accept pending registration requests, assign roles, and manage staff access."
            >
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreateForm(prev => !prev)}
                >
                    <UserPlus size={15} /> {showCreateForm ? 'Close Form' : 'Create Staff Account'}
                </button>
            </PageHeader>

            {/* SECTION 1: PENDING ACCOUNT REQUESTS (MUST BE ACCEPTED BY ADMIN) */}
            <div className="card mb-20" style={{
                border: pendingRequests.length > 0 ? '1px solid #fde68a' : '1px solid var(--border)',
                background: pendingRequests.length > 0 ? '#fffdf5' : 'var(--bg-card)',
                padding: 20
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: pendingRequests.length > 0 ? '#fef3c7' : '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {pendingRequests.length > 0 ? <Clock size={20} color="#d97706" /> : <ShieldCheck size={20} color="#16a34a" />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>Pending Registration Requests</span>
                                {pendingRequests.length > 0 && (
                                    <span style={{
                                        background: '#d97706',
                                        color: '#ffffff',
                                        padding: '1px 8px',
                                        borderRadius: 12,
                                        fontSize: 11,
                                        fontWeight: 800
                                    }}>
                                        {pendingRequests.length} Needs Acceptance
                                    </span>
                                )}
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                                Public signups require administrator acceptance before users can log in to the system
                            </p>
                        </div>
                    </div>
                </div>

                {loadingUsers ? <SkeletonLoader /> : pendingRequests.length === 0 ? (
                    <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '12px 16px',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13
                    }}>
                        <CheckCircle2 size={18} color="#16a34a" />
                        <span>All account requests have been reviewed. No pending requests waiting for acceptance.</span>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <DataTable className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Requested Role</th>
                                        <th>Request Date</th>
                                        <th>Status</th>
                                        <th>Admin Decision</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingRequests.map(user => (
                                        <tr key={user.id} style={{ background: '#fff' }}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.fullName}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{user.email}</span>
                                            </td>
                                            <td>
                                                <select
                                                    className="form-control"
                                                    style={{ width: 160, fontSize: 12, padding: '4px 8px' }}
                                                    aria-label={`Requested role for ${user.email}`}
                                                    value={user.role}
                                                    disabled={savingUserId === user.id}
                                                    onChange={event => updateUser(user, { role: event.target.value })}
                                                >
                                                    {ROLES.map(role => (
                                                        <option key={role.value} value={role.value}>{role.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <small style={{ color: 'var(--text-muted)' }}>
                                                    {user.createdAt ? formatDate(user.createdAt) : 'Recently'}
                                                </small>
                                            </td>
                                            <td>
                                                <span style={{
                                                    background: '#fef3c7',
                                                    color: '#b45309',
                                                    padding: '3px 9px',
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <Clock size={12} /> Pending Approval
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        type="button"
                                                        style={{
                                                            background: '#059669',
                                                            color: '#ffffff',
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                            padding: '5px 12px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 5
                                                        }}
                                                        disabled={savingUserId === user.id}
                                                        onClick={() => approveUser(user)}
                                                    >
                                                        <Check size={14} /> Accept Request
                                                    </button>
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        type="button"
                                                        style={{
                                                            borderColor: '#fca5a5',
                                                            color: '#dc2626',
                                                            fontSize: 12,
                                                            padding: '5px 10px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                        disabled={savingUserId === user.id}
                                                        onClick={() => rejectUser(user)}
                                                    >
                                                        <X size={14} /> Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </DataTable>
                    </div>
                )}
            </div>

            {/* OPTIONAL: ADMIN DIRECT CREATION FORM */}
            {showCreateForm && (
                <div className="card mb-20" style={{ maxWidth: 620, borderLeft: '4px solid var(--primary)', padding: 22 }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Directly Add Pre-Approved Staff Account</h3>
                    <form onSubmit={createUser} style={{ display: 'grid', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-full-name">Full name</label>
                            <input
                                className="form-control"
                                id="user-full-name"
                                name="fullName"
                                value={form.fullName}
                                onChange={updateForm}
                                autoComplete="name"
                                maxLength={120}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-email">Email</label>
                            <input
                                className="form-control"
                                id="user-email"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={updateForm}
                                autoComplete="email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-password">Initial password</label>
                            <input
                                className="form-control"
                                id="user-password"
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={updateForm}
                                autoComplete="new-password"
                                minLength={8}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="user-role">Role</label>
                            <select className="form-control" id="user-role" name="role" value={form.role} onChange={updateForm}>
                                {ROLES.map(role => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0' }}>
                                {ROLE_ACCESS[form.role]}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button className="btn btn-primary" type="submit" disabled={saving}>
                                <UserPlus size={15} /> {saving ? 'Creating account...' : 'Create Account'}
                            </button>
                            <button className="btn btn-outline" type="button" onClick={() => setShowCreateForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* SECTION 2: APPROVED ACTIVE ACCOUNTS */}
            <section style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>Approved Staff Accounts</h2>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                            Active staff members authorized to access the construction platform
                        </p>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {activeAccounts.length} Active User{activeAccounts.length === 1 ? '' : 's'}
                    </span>
                </div>

                {loadingUsers ? <SkeletonLoader /> : activeAccounts.length === 0 ? (
                    <p className="card">No active accounts found.</p>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <DataTable className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Assigned Role</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeAccounts.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{user.fullName}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{user.email}</span>
                                            </td>
                                            <td>
                                                <select
                                                    className="form-control"
                                                    style={{ width: 170, fontSize: 13 }}
                                                    aria-label={`Role for ${user.email}`}
                                                    value={user.role}
                                                    disabled={savingUserId === user.id}
                                                    onChange={event => updateUser(user, { role: event.target.value })}
                                                >
                                                    {ROLES.map(role => (
                                                        <option key={role.value} value={role.value}>{role.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <span style={{
                                                    background: user.isActive ? '#dcfce7' : '#fee2e2',
                                                    color: user.isActive ? '#16a34a' : '#dc2626',
                                                    padding: '2px 8px',
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: user.isActive ? '#16a34a' : '#dc2626' }} />
                                                    {user.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    type="button"
                                                    disabled={savingUserId === user.id}
                                                    onClick={() => updateUser(user, { isActive: !user.isActive })}
                                                    title={user.isActive ? 'Temporarily revoke system access' : 'Restore system access'}
                                                >
                                                    <UserRoundCog size={14} />
                                                    {user.isActive ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    type="button"
                                                    aria-label={`Delete ${user.email}`}
                                                    disabled={savingUserId === user.id || currentUserId === user.id}
                                                    title={currentUserId === user.id ? 'You cannot delete your own account.' : undefined}
                                                    onClick={() => deleteUser(user)}
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </DataTable>
                    </div>
                )}
            </section>
        </div>
    );
}
