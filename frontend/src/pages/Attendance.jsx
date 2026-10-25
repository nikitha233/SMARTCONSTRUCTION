import { useEffect, useState } from 'react';
import { attendanceApi, workersApi, projectsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, LoadingSpinner, EmptyState, Modal, PageHeader, FormField } from '../components/UI';
import { Plus, CheckCircle, XCircle, Clock, Calendar, Users, Filter, CheckSquare } from 'lucide-react';

const STATUS_OPTS = ['Present', 'HalfDay', 'Absent'];

const emptyForm = {
    workerId: '',
    projectId: '',
    attendanceDate: new Date().toISOString().slice(0, 10),
    status: 'Present',
    notes: '',
};

export default function Attendance() {
    const [records, setRecords] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
    const [projectFilter, setProjectFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const toast = useToast();
    const { isAdminOrManager } = useAuth();

    const loadMetadata = async () => {
        try {
            const [wRes, pRes] = await Promise.all([
                workersApi.getAll(),
                projectsApi.getAll(),
            ]);
            setWorkers(wRes.data);
            setProjects(pRes.data);
        } catch {
            toast.error('Failed to load workers or projects');
        }
    };

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const params = {};
            if (dateFilter) params.date = dateFilter;
            if (projectFilter) params.projectId = projectFilter;
            const res = await attendanceApi.getAll(params);
            setRecords(res.data);
        } catch {
            toast.error('Failed to load attendance records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetadata();
    }, []);

    useEffect(() => {
        loadAttendance();
    }, [dateFilter, projectFilter]);

    const openMarkModal = () => {
        setForm({
            ...emptyForm,
            workerId: workers[0]?.id ? String(workers[0].id) : '',
            projectId: projectFilter || (projects[0]?.id ? String(projects[0].id) : ''),
            attendanceDate: dateFilter || new Date().toISOString().slice(0, 10),
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.workerId) {
            toast.warning('Please select a worker');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                workerId: Number(form.workerId),
                projectId: form.projectId ? Number(form.projectId) : null,
                attendanceDate: new Date(form.attendanceDate).toISOString(),
                status: form.status,
                notes: form.notes,
            };

            await attendanceApi.create(payload);
            toast.success('Attendance recorded');
            setModalOpen(false);
            loadAttendance();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record attendance');
        } finally {
            setSaving(false);
        }
    };

    const presentCount = records.filter(r => r.status === 'Present').length;
    const halfDayCount = records.filter(r => r.status === 'HalfDay').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const totalWageDisbursed = records.reduce((acc, r) => acc + (r.wageForDay || 0), 0);

    return (
        <div>
            <PageHeader
                title="Labor Attendance Register"
                subtitle="Daily biometric & trade attendance, shift roll calls, and daily wage settlements"
            >
                {isAdminOrManager() && (
                    <button className="btn btn-primary" onClick={openMarkModal}>
                        <CheckSquare size={16} /> Mark Attendance
                    </button>
                )}
            </PageHeader>

            {/* Quick KPI stats */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-card-top">
                        <div>
                            <div className="stat-label">Present On Site</div>
                            <div className="stat-value" style={{ color: 'var(--success)' }}>{presentCount}</div>
                        </div>
                        <div className="stat-icon" style={{ background: '#dcfce7' }}>
                            <CheckCircle size={22} color="#16a34a" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-top">
                        <div>
                            <div className="stat-label">Half-Day Shift</div>
                            <div className="stat-value" style={{ color: 'var(--warning)' }}>{halfDayCount}</div>
                        </div>
                        <div className="stat-icon" style={{ background: '#fef3c7' }}>
                            <Clock size={22} color="#d97706" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-top">
                        <div>
                            <div className="stat-label">Absent</div>
                            <div className="stat-value" style={{ color: 'var(--danger)' }}>{absentCount}</div>
                        </div>
                        <div className="stat-icon" style={{ background: '#fee2e2' }}>
                            <XCircle size={22} color="#dc2626" />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-top">
                        <div>
                            <div className="stat-label">Day Wage Liability</div>
                            <div className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(totalWageDisbursed)}</div>
                        </div>
                        <div className="stat-icon" style={{ background: '#d1fae5' }}>
                            <Users size={22} color="#059669" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 200 }}>
                    <input
                        type="date"
                        className="form-control"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                    />
                </div>
                <div style={{ minWidth: 240 }}>
                    <select
                        className="form-control"
                        value={projectFilter}
                        onChange={e => setProjectFilter(e.target.value)}
                    >
                        <option value="">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : records.length === 0 ? (
                <EmptyState
                    icon={<Calendar size={48} color="var(--text-muted)" />}
                    title="No attendance entries recorded for this date"
                    description="Select another date or click Mark Attendance to log worker presence."
                    action={
                        isAdminOrManager() && (
                            <button className="btn btn-primary" onClick={openMarkModal} style={{ marginTop: 16 }}>
                                <Plus size={16} /> Mark Attendance Now
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
                                    <th>Assigned Site / Project</th>
                                    <th>Date</th>
                                    <th>Attendance Status</th>
                                    <th>Wage Disbursed</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.workerName}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Worker ID: #{r.workerId}</div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {r.projectName || 'General Roster'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>{formatDate(r.attendanceDate)}</div>
                                        </td>
                                        <td>
                                            <StatusBadge status={r.status} />
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: r.wageForDay > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                {formatCurrency(r.wageForDay)}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.notes || '—'}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Attendance Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Mark Daily Attendance"
                maxWidth={500}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" form="attendanceForm" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Recording...' : 'Record Attendance'}
                        </button>
                    </div>
                }
            >
                <form id="attendanceForm" onSubmit={handleSave}>
                    <FormField label="Worker" required>
                        <select
                            className="form-control"
                            value={form.workerId}
                            onChange={e => setForm({ ...form, workerId: e.target.value })}
                            required
                        >
                            <option value="">Select Worker</option>
                            {workers.map(w => (
                                <option key={w.id} value={w.id}>{w.fullName} ({w.jobTitle}) - {formatCurrency(w.dailyWage)}/day</option>
                            ))}
                        </select>
                    </FormField>

                    <FormField label="Assigned Project / Site">
                        <select
                            className="form-control"
                            value={form.projectId}
                            onChange={e => setForm({ ...form, projectId: e.target.value })}
                        >
                            <option value="">None / Floating Roster</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </FormField>

                    <div className="grid-2">
                        <FormField label="Attendance Date" required>
                            <input
                                type="date"
                                className="form-control"
                                value={form.attendanceDate}
                                onChange={e => setForm({ ...form, attendanceDate: e.target.value })}
                                required
                            />
                        </FormField>

                        <FormField label="Status" required>
                            <select
                                className="form-control"
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                                required
                            >
                                {STATUS_OPTS.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Remarks / Shift Details">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Overtime approved, night shift duty, late arrival"
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </FormField>
                </form>
            </Modal>
        </div>
    );
}
