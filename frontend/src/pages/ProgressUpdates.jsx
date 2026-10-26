import { useCallback, useEffect, useRef, useState } from 'react';
import { progressApi, lookupApi, stagesApi } from '../services/api';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import { formatDate } from '../utils/helpers';
import { ProgressBar, SkeletonLoader, EmptyState, Modal, PageHeader, FormField } from '../components/UI';
import { Plus, TrendingUp, AlertTriangle, ShieldCheck, Calendar } from 'lucide-react';
import { useRequestController } from '../hooks/useRequestController';
import { useApi } from '../hooks/useApi';

const TODAY_DATE = new Date().toISOString().slice(0, 10);
const EMPTY_UPDATES = [];

const emptyForm = {
    projectId: '',
    constructionStageId: '',
    updateDate: TODAY_DATE,
    completionPercentage: 50,
    workCompletedToday: '',
    workPlannedForTomorrow: '',
    issuesAndDelays: '',
    safetyObservations: '',
    responsibleEngineer: '',
};

export default function ProgressUpdates() {
    const [projects, setProjects] = useState([]);
    const [stages, setStages] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const toast = useToast();
    const { user, hasRole } = useAuth();
    const canCreateProgress = hasRole('Admin', 'ProjectManager', 'SiteEngineer');
    const createRequestController = useRequestController();
    const stagesControllerRef = useRef(null);
    const fetchUpdates = useCallback(async (signal) => {
        const res = await progressApi.getAll(selectedProject ? { projectId: selectedProject } : {}, { signal });
        return res.data;
    }, [selectedProject]);
    const { data: updates = EMPTY_UPDATES, loading, error, refetch: loadUpdates } = useApi(fetchUpdates, { initialData: EMPTY_UPDATES });

    useEffect(() => {
        if (error) toast.error(error.response?.data?.message || 'Failed to load progress reports');
    }, [error, toast]);

    const loadProjects = useCallback(async (signal) => {
        try {
            const res = await lookupApi.getAll({ signal });
            setProjects(res.data.projects);
        } catch {
            if (!signal?.aborted) toast.error('Failed to load projects');
        }
    }, [toast]);

    useEffect(() => {
        const controller = createRequestController();
        queueMicrotask(() => { if (!controller.signal.aborted) loadProjects(controller.signal); });
        return () => controller.abort();
    }, [createRequestController, loadProjects]);

    // When project changes in the form, fetch its stages
    const handleProjectChangeInForm = async (projId) => {
        setForm(prev => ({ ...prev, projectId: projId, constructionStageId: '' }));
        stagesControllerRef.current?.abort();
        if (projId) {
            const controller = createRequestController();
            stagesControllerRef.current = controller;
            try {
                const res = await stagesApi.getAll({ projectId: projId }, { signal: controller.signal });
                setStages(res.data);
            } catch {
                if (!controller.signal.aborted) setStages([]);
            }
        } else {
            setStages([]);
        }
    };

    const openCreate = () => {
        const defaultProj = selectedProject || (projects[0]?.id ? String(projects[0].id) : '');
        setForm({
            ...emptyForm,
            projectId: defaultProj,
            responsibleEngineer: user?.fullName || ''
        });
        if (defaultProj) {
            handleProjectChangeInForm(defaultProj);
        }
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.projectId) {
            toast.warning('Please select a project');
            return;
        }
        if (!form.workCompletedToday.trim()) {
            toast.warning('Please specify work completed today');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                projectId: Number(form.projectId),
                constructionStageId: form.constructionStageId ? Number(form.constructionStageId) : null,
                updateDate: new Date(form.updateDate).toISOString(),
                completionPercentage: Number(form.completionPercentage),
                workCompletedToday: form.workCompletedToday,
                workPlannedForTomorrow: form.workPlannedForTomorrow,
                issuesAndDelays: form.issuesAndDelays,
                safetyObservations: form.safetyObservations,
                responsibleEngineer: form.responsibleEngineer || user?.fullName || 'Resident Engineer',
            };

            await progressApi.create(payload);
            toast.success('Site progress update logged successfully');
            setModalOpen(false);
            loadUpdates();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit progress update');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Progress Updates"
                subtitle="Daily site operations logs, safety observations, and engineering progress"
            >
                {canCreateProgress && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Log Daily Progress
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
                <SkeletonLoader />
            ) : updates.length === 0 ? (
                <EmptyState
                    icon={<TrendingUp size={48} color="var(--text-muted)" />}
                    title="No progress updates recorded"
                    description="Log daily site reports to keep track of physical execution and safety records."
                    action={
                        canCreateProgress && (
                            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
                                <Plus size={16} /> Log First Report
                            </button>
                        )
                    }
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {updates.map(u => (
                        <div key={u.id} className="card" style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{u.projectName}</h3>
                                        {u.stageName && (
                                            <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }}>
                                                {u.stageName}
                                            </span>
                                        )}
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Calendar size={13} /> {formatDate(u.updateDate)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Filed by: <strong style={{ color: 'var(--text-primary)' }}>{u.responsibleEngineer}</strong>
                                    </div>
                                </div>
                                <div style={{ minWidth: 160 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Stage Completion</div>
                                    <ProgressBar percent={u.completionPercentage} />
                                </div>
                            </div>

                            <div className="grid-2" style={{ marginTop: 12, gap: 16 }}>
                                <div style={{ background: 'var(--bg-page)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6 }}>
                                        Work Completed Today
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                        {u.workCompletedToday || 'No details specified.'}
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-page)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        Planned for Tomorrow
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                        {u.workPlannedForTomorrow || 'Routine scheduled operations.'}
                                    </div>
                                </div>
                            </div>

                            {(u.issuesAndDelays || u.safetyObservations) && (
                                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                                    {u.issuesAndDelays && (
                                        <div style={{ flex: 1, minWidth: 260, display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fef3c7', padding: 10, borderRadius: 8 }}>
                                            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Issues / Obstacles</div>
                                                <div style={{ fontSize: 13, color: '#b45309' }}>{u.issuesAndDelays}</div>
                                            </div>
                                        </div>
                                    )}

                                    {u.safetyObservations && (
                                        <div style={{ flex: 1, minWidth: 260, display: 'flex', gap: 8, alignItems: 'flex-start', background: '#ecfdf5', border: '1px solid #d1fae5', padding: 10, borderRadius: 8 }}>
                                            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>Safety Observation (IS 14489)</div>
                                                <div style={{ fontSize: 13, color: '#047857' }}>{u.safetyObservations}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Daily Progress Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Log Daily Site Progress Report"
                maxWidth={650}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" form="progressForm" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Submit Daily Report'}
                        </button>
                    </div>
                }
            >
                <form id="progressForm" onSubmit={handleSave}>
                    <div className="grid-2">
                        <FormField label="Project" required>
                            <select
                                className="form-control"
                                value={form.projectId}
                                onChange={e => handleProjectChangeInForm(e.target.value)}
                                required
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Construction Stage">
                            <select
                                className="form-control"
                                value={form.constructionStageId}
                                onChange={e => setForm({ ...form, constructionStageId: e.target.value })}
                            >
                                <option value="">Entire Project / General</option>
                                {stages.map(s => (
                                    <option key={s.id} value={s.id}>#{s.stageOrder} - {s.stageName}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="grid-3">
                        <FormField label="Report Date" required>
                            <input
                                type="date"
                                className="form-control"
                                value={form.updateDate}
                                onChange={e => setForm({ ...form, updateDate: e.target.value })}
                                required
                            />
                        </FormField>

                        <FormField label="Completion (%)" required>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="form-control"
                                value={form.completionPercentage}
                                onChange={e => setForm({ ...form, completionPercentage: e.target.value })}
                                required
                            />
                        </FormField>

                        <FormField label="Responsible Engineer">
                            <input
                                type="text"
                                className="form-control"
                                value={form.responsibleEngineer}
                                onChange={e => setForm({ ...form, responsibleEngineer: e.target.value })}
                            />
                        </FormField>
                    </div>

                    <FormField label="Work Completed Today" required>
                        <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Detail rebar tying, concrete pour volume (m³), shuttering progress, curing..."
                            value={form.workCompletedToday}
                            onChange={e => setForm({ ...form, workCompletedToday: e.target.value })}
                            required
                        />
                    </FormField>

                    <FormField label="Work Planned for Tomorrow">
                        <textarea
                            className="form-control"
                            rows="2"
                            placeholder="Tasks scheduled for the next shift..."
                            value={form.workPlannedForTomorrow}
                            onChange={e => setForm({ ...form, workPlannedForTomorrow: e.target.value })}
                        />
                    </FormField>

                    <div className="grid-2">
                        <FormField label="Issues, Weather or Material Delays">
                            <textarea
                                className="form-control"
                                rows="2"
                                placeholder="e.g. Heavy rain delay, concrete batch transit delay..."
                                value={form.issuesAndDelays}
                                onChange={e => setForm({ ...form, issuesAndDelays: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Safety Observation (PPE / BOCW)">
                            <textarea
                                className="form-control"
                                rows="2"
                                placeholder="e.g. 100% chin-strap compliance, scaffold tagged green..."
                                value={form.safetyObservations}
                                onChange={e => setForm({ ...form, safetyObservations: e.target.value })}
                            />
                        </FormField>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
