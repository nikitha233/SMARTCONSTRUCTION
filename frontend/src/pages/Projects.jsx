import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi } from '../services/api';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, ProgressBar, SkeletonLoader, EmptyState, ConfirmDialog, Modal, PageHeader, Pagination } from '../components/UI';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useApi } from '../hooks/useApi';
import { Plus, Search, Pencil, Trash2, Eye, FolderOpen } from 'lucide-react';

const TODAY_DATE = new Date().toISOString().slice(0, 10);

const STATUSES = ['Planning', 'InProgress', 'OnHold', 'Completed', 'Cancelled'];
const EMPTY_PAGE = { items: [], totalCount: 0 };

const emptyForm = {
    name: '', projectCode: '', description: '', buildingType: 'Residential',
    clientName: '', siteAddress: '', city: '', startDate: TODAY_DATE,
    plannedCompletionDate: '', estimatedBudget: '', projectManager: '', status: 'Planning',
};

export default function Projects() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebouncedValue(search);
    const pageSize = 20;
    const [modalOpen, setModalOpen] = useState(false);
    const [editProject, setEditProject] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const toast = useToast();
    const { isAdminOrManager } = useAuth();

    const fetchProjects = useCallback(async (signal) => {
        const response = await projectsApi.getAll({ search: debouncedSearch, status: statusFilter, page, pageSize }, { signal });
        return { items: response.data.items, totalCount: response.data.totalCount };
    }, [debouncedSearch, page, pageSize, statusFilter]);
    const { data: projectPage, loading, error, refetch } = useApi(fetchProjects, { initialData: EMPTY_PAGE });
    const projects = projectPage.items;
    const totalCount = projectPage.totalCount;

    useEffect(() => {
        if (error) toast.error('Failed to load projects');
    }, [error, toast]);

    const openCreate = () => { setEditProject(null); setForm(emptyForm); setModalOpen(true); };
    const openEdit = (p) => {
        setEditProject(p);
        setForm({
            name: p.name, projectCode: p.projectCode, description: p.description,
            buildingType: p.buildingType, clientName: p.clientName,
            siteAddress: p.siteAddress, city: p.city,
            startDate: p.startDate?.slice(0, 10) || '',
            plannedCompletionDate: p.plannedCompletionDate?.slice(0, 10) || '',
            estimatedBudget: p.estimatedBudget, projectManager: p.projectManager,
            status: p.status, completionPercentage: p.completionPercentage,
            actualCompletionDate: p.actualCompletionDate?.slice(0, 10) || '',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.projectCode || !form.clientName) {
            toast.error('Project name, code, and client name are required.');
            return;
        }
        setSaving(true);
        try {
            if (editProject) {
                await projectsApi.update(editProject.id, {
                    ...form, estimatedBudget: parseFloat(form.estimatedBudget),
                    completionPercentage: parseInt(form.completionPercentage || 0),
                });
                toast.success('Project updated');
            } else {
                await projectsApi.create({ ...form, estimatedBudget: parseFloat(form.estimatedBudget) });
                toast.success('Project created');
            }
            setModalOpen(false);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save project');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await projectsApi.delete(deleteId);
            toast.success('Project deleted');
            setDeleteId(null);
            load();
        } catch {
            toast.error('Failed to delete project');
        }
    };

    const f = v => setForm(p => ({ ...p, ...v }));

    return (
        <div>
            <PageHeader title="Projects" subtitle={`${totalCount} total projects`}>
                {isAdminOrManager() && (
                    <button className="btn btn-primary" onClick={openCreate} id="btn-create-project">
                        <Plus size={16} /> New Project
                    </button>
                )}
            </PageHeader>

            {/* Filters */}
            <div className="filter-bar">
                <div className="search-input">
                    <Search size={16} color="var(--text-muted)" />
                    <input placeholder="Search projects…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} id="project-search" />
                </div>
                <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} id="status-filter">
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {loading ? <SkeletonLoader /> : (
                projects.length === 0 ? (
                    <EmptyState icon={<FolderOpen size={48} />} title="No projects found" description="Create your first project to get started." />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {projects.map(p => (
                            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.projectCode} · {p.city}</div>
                                    </div>
                                    <StatusBadge status={p.status} />
                                </div>

                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <div>Client: <strong>{p.clientName}</strong></div>
                                    <div>Manager: {p.projectManager}</div>
                                </div>

                                <ProgressBar percent={p.completionPercentage} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                                    <div><div style={{ color: 'var(--text-muted)' }}>Budget</div><div style={{ fontWeight: 700 }}>{formatCurrency(p.estimatedBudget)}</div></div>
                                    <div><div style={{ color: 'var(--text-muted)' }}>Spent</div><div style={{ fontWeight: 700 }}>{formatCurrency(p.actualCost)}</div></div>
                                    <div><div style={{ color: 'var(--text-muted)' }}>Start</div><div>{formatDate(p.startDate)}</div></div>
                                    <div><div style={{ color: 'var(--text-muted)' }}>Due</div><div>{formatDate(p.plannedCompletionDate)}</div></div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <Link to={`/projects/${p.id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                                        <Eye size={14} /> View
                                    </Link>
                                    {isAdminOrManager() && (
                                        <>
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                                            <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => setDeleteId(p.id)}><Trash2 size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
                title={editProject ? 'Edit Project' : 'Create New Project'}
                maxWidth={700}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Project'}</button>
                    </>
                }
            >
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Project Name *</label>
                        <input className="form-control" value={form.name} onChange={e => f({ name: e.target.value })} placeholder="Green Valley Residential" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Project Code *</label>
                        <input className="form-control" value={form.projectCode} onChange={e => f({ projectCode: e.target.value })} placeholder="GV-2024-001" disabled={!!editProject} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Client Name *</label>
                        <input className="form-control" value={form.clientName} onChange={e => f({ clientName: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Building Type</label>
                        <select className="form-control" value={form.buildingType} onChange={e => f({ buildingType: e.target.value })}>
                            {['Residential', 'Commercial', 'Industrial', 'Mixed Use', 'Infrastructure'].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Site Address</label>
                    <input className="form-control" value={form.siteAddress} onChange={e => f({ siteAddress: e.target.value })} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">City</label>
                        <input className="form-control" value={form.city} onChange={e => f({ city: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Project Manager</label>
                        <input className="form-control" value={form.projectManager} onChange={e => f({ projectManager: e.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input type="date" className="form-control" value={form.startDate} onChange={e => f({ startDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Planned Completion</label>
                        <input type="date" className="form-control" value={form.plannedCompletionDate} onChange={e => f({ plannedCompletionDate: e.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Estimated Budget (₹)</label>
                        <input type="number" className="form-control" value={form.estimatedBudget} onChange={e => f({ estimatedBudget: e.target.value })} placeholder="45000000" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-control" value={form.status} onChange={e => f({ status: e.target.value })}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                {editProject && (
                    <div className="form-group">
                        <label className="form-label">Completion % (0–100)</label>
                        <input type="number" min={0} max={100} className="form-control" value={form.completionPercentage || 0} onChange={e => f({ completionPercentage: e.target.value })} />
                    </div>
                )}
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} value={form.description} onChange={e => f({ description: e.target.value })} />
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteId}
                title="Delete Project"
                message="Are you sure you want to delete this project? All related data (stages, expenses, progress updates) will be permanently deleted."
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
