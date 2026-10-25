import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { formatCurrency, formatDate, daysUntil } from '../utils/helpers';
import { StatCard, StatusBadge, ProgressBar, LoadingSpinner, EmptyState } from '../components/UI';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    FolderOpen, CheckCircle, TrendingUp, DollarSign,
    Package, Truck, AlertTriangle, Activity, Plus, ArrowRight
} from 'lucide-react';

const PICOLORS = ['#52b788', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        dashboardApi.get()
            .then(r => setData(r.data))
            .catch(() => setError('Failed to load dashboard data.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner fullPage />;
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (!data) return null;

    const budgetData = data.recentProjects.map(p => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
        Estimated: Math.round(p.estimatedBudget / 100000),
        Actual: Math.round(p.actualCost / 100000),
    }));

    const expenseChartData = (data.monthlyExpenses || []).map(m => ({
        month: m.month,
        Amount: Math.round(m.amount / 1000),
    }));

    return (
        <div>
            {/* Stat Cards */}
            <div className="stats-grid mb-24">
                <StatCard
                    label="Total Projects"
                    value={data.totalProjects}
                    icon={(p) => <FolderOpen {...p} />}
                    iconBg="#dce9f0" iconColor="#1d4ed8"
                    subValue={`${data.activeProjects} active, ${data.completedProjects} completed`}
                />
                <StatCard
                    label="Avg. Completion"
                    value={`${data.averageCompletion}%`}
                    icon={(p) => <TrendingUp {...p} />}
                    iconBg="#d1fae5" iconColor="#059669"
                />
                <StatCard
                    label="Total Budget"
                    value={formatCurrency(data.totalEstimatedBudget)}
                    icon={(p) => <DollarSign {...p} />}
                    iconBg="#fef3c7" iconColor="#d97706"
                    subValue={`Spent: ${formatCurrency(data.totalActualCost)}`}
                />
                <StatCard
                    label="Remaining Budget"
                    value={formatCurrency(data.totalRemainingBudget)}
                    icon={(p) => <Activity {...p} />}
                    iconBg="#f0fdf4" iconColor="#16a34a"
                />
                <StatCard
                    label="Low Stock Alerts"
                    value={data.lowStockMaterials}
                    icon={(p) => <Package {...p} />}
                    iconBg={data.lowStockMaterials > 0 ? '#fee2e2' : '#d1fae5'}
                    iconColor={data.lowStockMaterials > 0 ? '#dc2626' : '#059669'}
                />
                <StatCard
                    label="Available Equipment"
                    value={data.availableEquipment}
                    icon={(p) => <Truck {...p} />}
                    iconBg="#ede9fe" iconColor="#7c3aed"
                />
            </div>

            {/* Charts Row */}
            <div className="charts-grid mb-24">
                {budgetData.length > 0 && (
                    <div className="chart-card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Budget vs Actual (Lakhs ₹)</div>
                                <div className="card-subtitle">Estimated vs spent per project</div>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={budgetData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => `₹${v}L`} />
                                <Bar dataKey="Estimated" fill="#d4e6da" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Actual" fill="#52b788" radius={[4, 4, 0, 0]} />
                                <Legend />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {expenseChartData.length > 0 && (
                    <div className="chart-card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Monthly Expenses (₹ '000)</div>
                                <div className="card-subtitle">Last 6 months expenditure</div>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={expenseChartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => `₹${v}K`} />
                                <Bar dataKey="Amount" fill="#52b788" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Two Columns */}
            <div className="charts-grid">
                {/* Recent Projects */}
                <div className="card">
                    <div className="card-header">
                        <div><div className="card-title">Recent Projects</div></div>
                        <Link to="/projects" className="btn btn-outline btn-sm">
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>
                    {data.recentProjects.length === 0 ? (
                        <EmptyState title="No projects yet" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {data.recentProjects.map(p => (
                                <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px', borderRadius: 8, transition: 'background .2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                                            <StatusBadge status={p.status} />
                                        </div>
                                        <ProgressBar percent={p.completionPercentage} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                                            <span>Due: {formatDate(p.plannedCompletionDate)}</span>
                                            <span>{formatCurrency(p.actualCost)} / {formatCurrency(p.estimatedBudget)}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Low Stock */}
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <div className="card-title">
                                <Package size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Low Stock Alerts
                            </div>
                            <Link to="/materials" className="btn btn-outline btn-sm">View</Link>
                        </div>
                        {data.lowStockAlerts.length === 0 ? (
                            <div style={{ color: 'var(--success)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle size={16} /> All materials adequately stocked
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {data.lowStockAlerts.slice(0, 5).map(m => (
                                    <div key={m.id} className="alert alert-warning" style={{ padding: '8px 12px' }}>
                                        <AlertTriangle size={14} />
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{m.name}</span>
                                            <div style={{ fontSize: 11 }}>Stock: {m.currentStock} {m.unit} (Min: {m.minimumStockThreshold})</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Maintenance Alerts */}
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <div className="card-title">
                                <Truck size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Maintenance Due
                            </div>
                            <Link to="/equipment" className="btn btn-outline btn-sm">View</Link>
                        </div>
                        {data.maintenanceAlerts.length === 0 ? (
                            <div style={{ color: 'var(--success)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle size={16} /> No maintenance due in 30 days
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {data.maintenanceAlerts.map(e => {
                                    const days = daysUntil(e.nextMaintenanceDate);
                                    return (
                                        <div key={e.id} className={`alert ${days < 7 ? 'alert-danger' : 'alert-warning'}`} style={{ padding: '8px 12px' }}>
                                            <AlertTriangle size={14} />
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{e.name}</span>
                                                <div style={{ fontSize: 11 }}>{e.equipmentCode} · {days !== null ? `${days} days` : 'Unknown'}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card mt-24">
                <div className="card-title mb-16">Quick Actions</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link to="/projects" className="btn btn-primary btn-sm"><Plus size={15} /> New Project</Link>
                    <Link to="/expenses" className="btn btn-accent btn-sm"><Plus size={15} /> Record Expense</Link>
                    <Link to="/progress" className="btn btn-outline btn-sm"><Plus size={15} /> Progress Update</Link>
                    <Link to="/attendance" className="btn btn-outline btn-sm"><Plus size={15} /> Mark Attendance</Link>
                    <Link to="/materials" className="btn btn-outline btn-sm"><Plus size={15} /> Stock Transaction</Link>
                </div>
            </div>
        </div>
    );
}
