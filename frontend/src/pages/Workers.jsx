import { useEffect, useState } from 'react';
import { workersApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, LoadingSpinner, EmptyState, ConfirmDialog, Modal, PageHeader, FormField } from '../components/UI';
import { Plus, Search, Pencil, Trash2, Users, Phone, Calendar, Banknote } from 'lucide-react';

const TRADES = [
    'Bar Bender',
    'Shuttering Carpenter',
    'Rajmistri (Mason)',
    'Crane / Hydra Operator',
    'Excavator Operator',
    'RMC Batching Technician',
    'Welder / Fabricator',
    'Electrician',
    'Safety Marshal',
    'General Helper'
];

const STATUSES = ['Active', 'Inactive', 'Suspended'];

const emptyForm = {
    fullName: '',
    phoneNumber: '',
    jobTitle: 'Bar Bender',
    joiningDate: new Date().toISOString().slice(0, 10),
    dailyWage: 750,
    employmentStatus: 'Active',
};

export default function Workers() {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editWorker, setEditWorker] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const toast = useToast();
    const { isAdminOrManager } = useAuth();

    const loadWorkers = () => {
        setLoading(true);
        workersApi.getAll({ search, status: statusFilter })
            .then(res => setWorkers(res.data))
            .catch(() => toast.error('Failed to load workers'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadWorkers();
    }, [search, statusFilter]);

    const openCreate = () => {
        setEditWorker(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (w) => {
        setEditWorker(w);
        setForm({
            fullName: w.fullName,
            phoneNumber: w.phoneNumber || '',
            jobTitle: w.jobTitle,
            joiningDate: w.joiningDate ? w.joiningDate.slice(0, 10) : '',
            dailyWage: w.dailyWage || 0,
            employmentStatus: w.employmentStatus || 'Active',
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.fullName.trim()) {
            toast.warning('Full name is required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                dailyWage: Number(form.dailyWage),
                joiningDate: new Date(form.joiningDate).toISOString(),
            };

            if (editWorker) {
                await workersApi.update(editWorker.id, payload);
                toast.success('Worker details updated');
            } else {
                await workersApi.create(payload);
                toast.success('Worker added to muster roll');
            }
            setModalOpen(false);
            loadWorkers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save worker');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await workersApi.delete(deleteId);
            toast.success('Worker removed');
            setDeleteId(null);
            loadWorkers();
        } catch {
            toast.error('Failed to delete worker');
        }
    };

    return (
        <div>
            <PageHeader
                title="Workforce & Trades"
                subtitle="Manage registered construction labor, trade certifications, and daily wages"
            >
                {isAdminOrManager() && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Register Worker
                    </button>
                )}
            </PageHeader>

            {/* Filter and Search Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by worker name or trade..."
                        style={{ paddingLeft: 36 }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ width: 180 }}>
                    <select
                        className="form-control"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : workers.length === 0 ? (
                <EmptyState
                    icon={<Users size={48} color="var(--text-muted)" />}
                    title="No workers found"
                    description="Register bar benders, masons, carpenters, and crane operators to the muster roll."
                    action={
                        isAdminOrManager() && (
                            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
                                <Plus size={16} /> Register Worker
                            </button>
                        )
                    }
                />
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Worker Name</th>
                                    <th>Trade / Job Title</th>
                                    <th>Contact</th>
                                    <th>Joining Date</th>
                                    <th>Daily Wage</th>
                                    <th>Status</th>
                                    {isAdminOrManager() && <th style={{ textAlign: 'right' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {workers.map(w => (
                                    <tr key={w.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: '50%',
                                                    background: 'var(--primary)', color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: 13
                                                }}>
                                                    {w.fullName.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.fullName}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: #{w.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', fontWeight: 600 }}>
                                                {w.jobTitle}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <Phone size={13} /> {w.phoneNumber || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>{formatDate(w.joiningDate)}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(w.dailyWage)}/day</div>
                                        </td>
                                        <td>
                                            <StatusBadge status={w.employmentStatus} />
                                        </td>
                                        {isAdminOrManager() && (
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn-icon"
                                                        title="Edit Worker"
                                                        onClick={() => openEdit(w)}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        title="Delete Worker"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => setDeleteId(w.id)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Worker Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editWorker ? `Edit Worker: ${editWorker.fullName}` : 'Register New Worker'}
                maxWidth={540}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" form="workerForm" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : editWorker ? 'Save Changes' : 'Register Worker'}
                        </button>
                    </div>
                }
            >
                <form id="workerForm" onSubmit={handleSave}>
                    <FormField label="Full Name" required>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Ramesh Kumar"
                            value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                            required
                        />
                    </FormField>

                    <div className="grid-2">
                        <FormField label="Trade / Job Title" required>
                            <select
                                className="form-control"
                                value={form.jobTitle}
                                onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                                required
                            >
                                {TRADES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Phone Number">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="+91 98765 43210"
                                value={form.phoneNumber}
                                onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                            />
                        </FormField>
                    </div>

                    <div className="grid-3">
                        <FormField label="Joining Date" required>
                            <input
                                type="date"
                                className="form-control"
                                value={form.joiningDate}
                                onChange={e => setForm({ ...form, joiningDate: e.target.value })}
                                required
                            />
                        </FormField>

                        <FormField label="Daily Wage (INR)" required>
                            <input
                                type="number"
                                min="0"
                                step="50"
                                className="form-control"
                                value={form.dailyWage}
                                onChange={e => setForm({ ...form, dailyWage: e.target.value })}
                                required
                            />
                        </FormField>

                        <FormField label="Employment Status">
                            <select
                                className="form-control"
                                value={form.employmentStatus}
                                onChange={e => setForm({ ...form, employmentStatus: e.target.value })}
                            >
                                {STATUSES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="Remove Worker"
                message="Are you sure you want to remove this worker from the roster? Historical attendance records will be preserved."
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
