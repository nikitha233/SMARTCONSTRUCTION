import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsApi, stagesApi, expensesApi, progressApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, ProgressBar, LoadingSpinner } from '../components/UI';
import { ArrowLeft, Calendar, DollarSign, Users, Truck } from 'lucide-react';

const TABS = ['Overview', 'Stages', 'Expenses', 'Progress'];

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [stages, setStages] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [progress, setProgress] = useState([]);
    const [tab, setTab] = useState('Overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            projectsApi.getById(id),
            projectsApi.getStages(id),
            projectsApi.getExpenses(id),
            projectsApi.getProgressUpdates(id),
        ]).then(([pr, st, ex, pg]) => {
            setProject(pr.data);
            setStages(st.data);
            setExpenses(ex.data);
            setProgress(pg.data);
        }).catch(() => navigate('/projects'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <LoadingSpinner fullPage />;
    if (!project) return null;

    const budgetPct = project.estimatedBudget > 0
        ? Math.round((project.actualCost / project.estimatedBudget) * 100)
        : 0;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Link to="/projects" className="btn btn-outline btn-sm"><ArrowLeft size={15} /> Back</Link>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 800 }}>{project.name}</h1>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.projectCode} · {project.city}</div>
                </div>
                <StatusBadge status={project.status} />
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Completion', value: `${project.completionPercentage}%`, icon: <ProgressBar percent={project.completionPercentage} showLabel={false} /> },
                    { label: 'Budget', value: formatCurrency(project.estimatedBudget) },
                    { label: 'Spent', value: formatCurrency(project.actualCost) },
                    { label: 'Remaining', value: formatCurrency(project.estimatedBudget - project.actualCost) },
                ].map(c => (
                    <div key={c.label} className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{c.value}</div>
                        {c.icon && <div style={{ marginTop: 8 }}>{c.icon}</div>}
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs mb-16">
                {TABS.map(t => (
                    <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
                ))}
            </div>

            {tab === 'Overview' && (
                <div className="card">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {[
                            ['Client', project.clientName], ['Manager', project.projectManager],
                            ['Building Type', project.buildingType], ['Address', project.siteAddress],
                            ['Start Date', formatDate(project.startDate)], ['Planned Completion', formatDate(project.plannedCompletionDate)],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k}</div>
                                <div style={{ fontWeight: 600 }}>{v || '—'}</div>
                            </div>
                        ))}
                    </div>
                    {project.description && (
                        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Description</div>
                            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{project.description}</p>
                        </div>
                    )}
                </div>
            )}

            {tab === 'Stages' && (
                <div className="card">
                    {stages.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>No stages defined yet.</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {stages.map(s => (
                                <div key={s.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div>
                                            <span style={{ fontWeight: 700 }}>{s.stageOrder}. {s.stageName}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{s.assignedEngineer}</span>
                                        </div>
                                        <StatusBadge status={s.status} />
                                    </div>
                                    <ProgressBar percent={s.completionPercentage} />
                                    <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                        <span>Planned: {formatDate(s.plannedStartDate)} – {formatDate(s.plannedEndDate)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'Expenses' && (
                <div className="card">
                    <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 16 }}>
                        Total: {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th></tr></thead>
                            <tbody>
                                {expenses.map(e => (
                                    <tr key={e.id}>
                                        <td>{formatDate(e.expenseDate)}</td>
                                        <td><StatusBadge status={e.category} /></td>
                                        <td>{e.description}</td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(e.amount)}</td>
                                        <td>{e.paymentMethod}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'Progress' && (
                <div className="card">
                    {progress.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>No progress updates yet.</div> : (
                        <div className="timeline">
                            {progress.map((p, i) => (
                                <div key={p.id} className="timeline-item">
                                    <div className="timeline-line">
                                        <div className="timeline-dot" />
                                        {i < progress.length - 1 && <div className="timeline-connector" />}
                                    </div>
                                    <div className="timeline-content">
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <strong>{formatDate(p.updateDate)}</strong>
                                            <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{p.completionPercentage}%</span>
                                        </div>
                                        {p.stageName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.stageName}</div>}
                                        {p.workCompletedToday && <p style={{ fontSize: 13, marginTop: 4 }}>{p.workCompletedToday}</p>}
                                        {p.issuesAndDelays && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠ {p.issuesAndDelays}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
