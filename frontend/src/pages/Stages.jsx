import { useEffect, useState } from 'react';
import { stagesApi, projectsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { StatusBadge, ProgressBar, LoadingSpinner, EmptyState, ConfirmDialog, Modal, PageHeader, FormField } from '../components/UI';
import { Plus, Search, Pencil, Trash2, HardHat, Filter } from 'lucide-react';

const STATUS_OPTIONS = ['NotStarted', 'InProgress', 'Completed', 'Delayed', 'OnHold'];

const emptyForm = {
    projectId: '',
    stageName: '',
    stageOrder: 1,
    plannedStartDate: new Date().toISOString().slice(0, 10),
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    completionPercentage: 0,
    assignedEngineer: '',
    status: 'NotStarted',
    notes: '',
};

export default function Stages() {
    const [stages, setStages] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editStage, setEditStage] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const toast = useToast();
    const { isAdminOrManager } = useAuth();

    const loadProjects = async () => {
        try {
            const res = await projectsApi.getAll();
            setProjects(res.data);
        } catch {
            toast.error('Failed to load projects');
        }
    };

    const loadStages = async () => {
        setLoading(true);
        try {
            const res = await stagesApi.getAll(selectedProject ? { projectId: selectedProject } : {});
            setStages(res.data);
        } catch {
            toast.error('Failed to load stages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        loadStages();
    }, [selectedProject]);

    const openCreate = () => {
        setEditStage(null);
        setForm({
            ...emptyForm,
            projectId: selectedProject || (projects[0]?.id ? String(projects[0].id) : '')
        });
        setModalOpen(true);
    };

    const openEdit = (s) => {
        setEditStage(s);
        setForm({
            projectId: String(s.projectId),
            stageName: s.stageName,
            stageOrder: s.stageOrder || 1,
            plannedStartDate: s.plannedStartDate ? s.plannedStartDate.slice(0, 10) : '',
            plannedEndDate: s.plannedEndDate ? s.plannedEndDate.slice(0, 10) : '',
            actualStartDate: s.actualStartDate ? s.actualStartDate.slice(0, 10) : '',
            actualEndDate: s.actualEndDate ? s.actualEndDate.slice(0, 10) : '',
            completionPercentage: s.completionPercentage || 0,
            assignedEngineer: s.assignedEngineer || '',
            status: s.status || 'NotStarted',
            notes: s.notes || '',
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.stageName.trim()) {
            toast.warning('Stage name is required');
            return;
        }
        if (!form.projectId) {
            toast.warning('Please select a project');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                projectId: Number(form.projectId),
                stageOrder: Number(form.stageOrder),
                completionPercentage: Number(form.completionPercentage),
                plannedStartDate: form.plannedStartDate ? new Date(form.plannedStartDate).toISOString() : null,
                plannedEndDate: form.plannedEndDate ? new Date(form.plannedEndDate).toISOString() : null,
                actualStartDate: form.actualStartDate ? new Date(form.actualStartDate).toISOString() : null,
                actualEndDate: form.actualEndDate ? new Date(form.actualEndDate).toISOString() : null,
            };

            if (editStage) {
                await stagesApi.update(editStage.id, payload);
                toast.success('Stage updated successfully');
            } else {
                await stagesApi.create(payload);
                toast.success('Stage created successfully');
            }
            setModalOpen(false);
            loadStages();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save stage');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await stagesApi.delete(deleteId);
            toast.success('Stage deleted');
            setDeleteId(null);
            loadStages();
        } catch {
            toast.error('Failed to delete stage');
        }
    };

    return (
        <div>
            <PageHeader
                title="Construction Stages"
                subtitle="Track timeline, execution sequences, and engineering milestones"
            >
                {isAdminOrManager() && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Stage
                    </button>
                )}
            </PageHeader>

            {/* Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 260 }}>
                    <select
                        className="form-control"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        <option value="">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.projectCode})</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : stages.length === 0 ? (
                <EmptyState
                    icon={<HardHat size={48} color="var(--text-muted)" />}
                    title="No construction stages found"
                    description={selectedProject ? "No stages configured for this project yet." : "Select a project or create a new stage to begin tracking milestones."}
                    action={
                        isAdminOrManager() && (
                            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
                                <Plus size={16} /> Create Stage
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
                                    <th>Order</th>
                                    <th>Stage Name</th>
                                    <th>Planned Timeline</th>
                                    <th>Actual Timeline</th>
                                    <th>Assigned Engineer</th>
                                    <th style={{ width: 140 }}>Completion</th>
                                    <th>Status</th>
                                    {isAdminOrManager() && <th style={{ textAlign: 'right' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {stages.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>#{s.stageOrder}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.stageName}</div>
                                            {s.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.notes}</div>}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>{formatDate(s.plannedStartDate)} - {formatDate(s.plannedEndDate)}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {s.actualStartDate ? formatDate(s.actualStartDate) : 'Not Started'}
                                                {s.actualEndDate && ` - ${formatDate(s.actualEndDate)}`}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13, fontWeight: 500 }}>{s.assignedEngineer || 'Unassigned'}</span>
                                        </td>
                                        <td>
                                            <ProgressBar percent={s.completionPercentage || 0} />
                                        </td>
                                        <td>
                                            <StatusBadge status={s.status} />
                                        </td>
                                        {isAdminOrManager() && (
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn-icon"
                                                        title="Edit Stage"
                                                        onClick={() => openEdit(s)}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        title="Delete Stage"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => setDeleteId(s.id)}
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

            {/* Stage Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editStage ? `Edit Stage: ${editStage.stageName}` : 'Add Construction Stage'}
                maxWidth={620}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" form="stageForm" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : editStage ? 'Save Changes' : 'Create Stage'}
                        </button>
                    </div>
                }
            >
                <form id="stageForm" onSubmit={handleSave}>
                    <div className="grid-2">
                        <FormField label="Project" required>
                            <select
                                className="form-control"
                                value={form.projectId}
                                onChange={e => setForm({ ...form, projectId: e.target.value })}
                                required
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Stage Order" required>
                            <input
                                type="number"
                                min="1"
                                className="form-control"
                                value={form.stageOrder}
                                onChange={e => setForm({ ...form, stageOrder: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <FormField label="Stage Name" required>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Substructure & Piling, Structural Columns, Roofing"
                            value={form.stageName}
                            onChange={e => setForm({ ...form, stageName: e.target.value })}
                            required
                        />
                    </FormField>

                    <div className="grid-2">
                        <FormField label="Planned Start Date" required>
                            <input
                                type="date"
                                className="form-control"
                                value={form.plannedStartDate}
                                onChange={e => setForm({ ...form, plannedStartDate: e.target.value })}
                                required
                            />
                        </FormField>
                        <FormField label="Planned End Date" required>
                            <input
                                type="date"
                                className="form-control"
                                value={form.plannedEndDate}
                                onChange={e => setForm({ ...form, plannedEndDate: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <div className="grid-2">
                        <FormField label="Actual Start Date">
                            <input
                                type="date"
                                className="form-control"
                                value={form.actualStartDate}
                                onChange={e => setForm({ ...form, actualStartDate: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Actual End Date">
                            <input
                                type="date"
                                className="form-control"
                                value={form.actualEndDate}
                                onChange={e => setForm({ ...form, actualEndDate: e.target.value })}
                            />
                        </FormField>
                    </div>

                    <div className="grid-3">
                        <FormField label="Completion (%)">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="form-control"
                                value={form.completionPercentage}
                                onChange={e => setForm({ ...form, completionPercentage: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Assigned Engineer">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Sunil Verma"
                                value={form.assignedEngineer}
                                onChange={e => setForm({ ...form, assignedEngineer: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Status">
                            <select
                                className="form-control"
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                            >
                                {STATUS_OPTIONS.map(st => (
                                    <option key={st} value={st}>{st.replace(/([A-Z])/g, ' $1').trim()}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <FormField label="Engineering Notes / Specifications">
                        <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Specify design codes, concrete grades, curing requirements..."
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </FormField>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="Delete Construction Stage"
                message="Are you sure you want to delete this stage? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
