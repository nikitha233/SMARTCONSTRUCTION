import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../services/api';
import { useRequestController } from '../hooks/useRequestController';
import { useToast } from '../context/useToast';
import { formatCurrency } from '../utils/helpers';
import { StatCard, ProgressBar, SkeletonLoader, EmptyState, PageHeader, DataTable } from '../components/UI';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, PieChart as PieIcon, ArrowRight, FolderOpen } from 'lucide-react';

const COLORS = ['#2d6a4f', '#52b788', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Budget() {
    const [summary, setSummary] = useState([]);
    const [expenseData, setExpenseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const createRequestController = useRequestController();

    useEffect(() => {
        const controller = createRequestController();
        Promise.all([
            reportsApi.projectSummary(undefined, { signal: controller.signal }),
            reportsApi.expenses(undefined, { signal: controller.signal }),
        ])
            .then(([sumRes, expRes]) => {
                const list = Array.isArray(sumRes.data) ? sumRes.data : (sumRes.data ? [sumRes.data] : []);
                setSummary(list);
                setExpenseData(expRes.data);
            })
            .catch(() => { if (!controller.signal.aborted) toast.error('Failed to load budget data'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [createRequestController, toast]);

    if (loading) return <SkeletonLoader fullPage variant="cards" rows={4} />;

    const totalEstimated = summary.reduce((acc, p) => acc + (Number(p.estimatedBudget) || 0), 0);
    const totalActual = summary.reduce((acc, p) => acc + (Number(p.actualCost) || 0), 0);
    const totalRemaining = totalEstimated - totalActual;
    const overallUtilization = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

    const chartData = summary.map(p => ({
        name: p.name?.length > 14 ? p.name.slice(0, 14) + '…' : (p.name || 'Project'),
        Estimated: Math.round((Number(p.estimatedBudget) || 0) / 100000), // in Lakhs
        Actual: Math.round((Number(p.actualCost) || 0) / 100000),
    }));

    const categoryData = (expenseData?.byCategory || []).map(c => ({
        name: c.category || 'General',
        value: Number(c.total) || 0,
    }));

    return (
        <div>
            <PageHeader
                title="Budget & Financial Health"
                subtitle="High-level financial control, budget variances, and cost expenditure breakdowns"
            />

            {/* KPI Cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <StatCard
                    icon={(p) => <DollarSign {...p} />}
                    label="Total Approved Budget"
                    value={formatCurrency(totalEstimated)}
                    subValue="Across all active packages"
                    iconBg="#d1fae5"
                    iconColor="#059669"
                />

                <StatCard
                    icon={(p) => <TrendingUp {...p} />}
                    label="Total Spent to Date"
                    value={formatCurrency(totalActual)}
                    subValue={`${overallUtilization}% overall utilization`}
                    iconBg="#dbeafe"
                    iconColor="#2563eb"
                />

                <StatCard
                    icon={(p) => totalRemaining >= 0 ? <CheckCircle {...p} /> : <AlertTriangle {...p} />}
                    label="Remaining Capital"
                    value={formatCurrency(Math.abs(totalRemaining))}
                    subValue={totalRemaining >= 0 ? "Under budget reserve" : "Budget overrun warning"}
                    iconBg={totalRemaining >= 0 ? "#ecfdf5" : "#fee2e2"}
                    iconColor={totalRemaining >= 0 ? "#10b981" : "#ef4444"}
                />

                <StatCard
                    icon={(p) => <PieIcon {...p} />}
                    label="Financial Exposure"
                    value={`${overallUtilization}%`}
                    subValue="Overall fund commitment"
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                />
            </div>

            {/* Charts Row */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Estimated vs Actual Cost</div>
                            <div className="card-subtitle">Project values in ₹ Lakhs</div>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="name" fontSize={11} stroke="var(--text-muted)" />
                                    <YAxis fontSize={11} stroke="var(--text-muted)" />
                                    <Tooltip
                                        formatter={(val) => [`₹ ${val} Lakhs`]}
                                        contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Estimated" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Actual" fill="#52b788" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState
                                icon={<FolderOpen size={36} color="var(--text-muted)" />}
                                title="No project data"
                                description="Add projects to see budget comparisons."
                            />
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Expenditure by Category</div>
                            <div className="card-subtitle">Materials, labor, plant & equipment</div>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={95}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val) => [formatCurrency(val), 'Total']}
                                        contentStyle={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState
                                icon={<DollarSign size={36} color="var(--text-muted)" />}
                                title="No expense categories yet"
                                description="Log expenses to see breakdown."
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Project Financial Breakdown Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Project-by-Project Variance Ledger</h3>
                </div>
                <DataTable className="table-responsive">
<table className="data-table">
                        <thead>
                            <tr>
                                <th>Project Name</th>
                                <th>Estimated Budget</th>
                                <th>Actual Cost</th>
                                <th>Variance / Remaining</th>
                                <th style={{ width: 140 }}>Budget Used</th>
                                <th>Physical Progress</th>
                                <th style={{ textAlign: 'right' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.length === 0 ? (
                                <tr><td colSpan={7}><EmptyState
                                    title="No project budget data yet"
                                    description="Create a project to start tracking budgets and costs."
                                    action={<Link to="/projects" className="btn btn-primary" style={{ marginTop: 12 }}>View projects</Link>}
                                /></td></tr>
                            ) : summary.map(p => {
                                const remaining = (Number(p.estimatedBudget) || 0) - (Number(p.actualCost) || 0);
                                const isOver = remaining < 0;
                                const utilization = p.estimatedBudget > 0 ? Math.round(((Number(p.actualCost) || 0) / Number(p.estimatedBudget)) * 100) : 0;
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.projectCode} • {p.clientName}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{formatCurrency(p.estimatedBudget)}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.actualCost)}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: isOver ? 'var(--danger)' : 'var(--success)' }}>
                                                {formatCurrency(Math.abs(remaining))} {isOver ? '(Overrun)' : 'Left'}
                                            </div>
                                        </td>
                                        <td>
                                            <ProgressBar percent={utilization} />
                                        </td>
                                        <td>
                                            <ProgressBar percent={p.completionPercentage || 0} />
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Link to={`/projects/${p.id}`} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}>
                                                View <ArrowRight size={12} style={{ marginLeft: 4 }} />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
</DataTable>
            </div>
        </div>
    );
}
