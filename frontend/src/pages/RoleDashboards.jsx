import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    attendanceApi,
    expensesApi,
    materialsApi,
    progressApi,
    stagesApi,
    transactionsApi,
} from '../services/api';
import { useRequestController } from '../hooks/useRequestController';
import { formatDate } from '../utils/helpers';
import { EmptyState, PageHeader, ProgressBar, SkeletonLoader, StatCard, StatusBadge } from '../components/UI';
import {
    AlertTriangle,
    ClipboardCheck,
    ClipboardList,
    FileText,
    Package,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';

function useRoleDashboard(loadData) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const createRequestController = useRequestController();

    useEffect(() => {
        const controller = createRequestController();
        loadData(controller.signal)
            .then(setData)
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [createRequestController, loadData]);

    return { data, loading, error };
}

function DashboardState({ data, loading, error, onRetry, children }) {
    if (loading) return <SkeletonLoader fullPage variant="cards" rows={4} />;
    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                Could not load dashboard data. Please try again.
                <button className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button>
            </div>
        );
    }
    if (!data) return <SkeletonLoader fullPage variant="cards" rows={4} />;
    return children;
}

function QuickLink({ to, icon: Icon, children }) {
    return (
        <Link className="btn btn-outline btn-sm" to={to}>
            <Icon size={15} /> {children}
        </Link>
    );
}

export function EngineerDashboard() {
    const loadData = useCallback(async (signal) => {
        const today = new Date().toISOString().slice(0, 10);
        const [stagesResponse, attendanceResponse, progressResponse, expensesResponse] = await Promise.all([
            stagesApi.getAll({}, { signal }),
            attendanceApi.getAll({ date: today }, { signal }),
            progressApi.getAll({}, { signal }),
            expensesApi.getAll({ page: 1, pageSize: 1 }, { signal }),
        ]);
        return {
            stages: stagesResponse.data,
            attendance: attendanceResponse.data,
            progressUpdates: progressResponse.data,
            expenseCount: expensesResponse.data.totalCount,
        };
    }, []);
    const { data, loading, error } = useRoleDashboard(loadData);
    if (loading || error || !data) {
        return <DashboardState data={data} loading={loading} error={error} onRetry={() => window.location.reload()} />;
    }

    return (
        <DashboardState data={data} loading={loading} error={error} onRetry={() => window.location.reload()}>
            <PageHeader title="Site Engineer Dashboard" subtitle="Your daily site activity and construction progress" />
            <div className="stats-grid mb-24">
                <StatCard
                    label="Construction stages"
                    value={data.stages.length}
                    icon={ClipboardList}
                    subValue={`${data.stages.filter(stage => stage.status === 'InProgress').length} in progress`}
                />
                <StatCard
                    label="Attendance today"
                    value={data.attendance.length}
                    icon={ClipboardCheck}
                    subValue={`${data.attendance.filter(record => record.status === 'Present').length} marked present`}
                />
                <StatCard
                    label="Progress updates"
                    value={data.progressUpdates.length}
                    icon={TrendingUp}
                    subValue="Recorded project updates"
                />
                <StatCard
                    label="Expense records"
                    value={data.expenseCount}
                    icon={FileText}
                    subValue="Project expenses recorded"
                />
            </div>

            <div className="charts-grid">
                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Construction stages</div>
                        <QuickLink to="/stages" icon={ClipboardList}>View stages</QuickLink>
                    </div>
                    {data.stages.length === 0 ? (
                        <EmptyState title="No stages yet" description="Stages will appear here when they are added to a project." />
                    ) : (
                        <div style={{ display: 'grid', gap: 14 }}>
                            {data.stages.slice(0, 6).map(stage => (
                                <div key={stage.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                                        <span style={{ fontWeight: 600 }}>{stage.stageName}</span>
                                        <StatusBadge status={stage.status} />
                                    </div>
                                    <ProgressBar percent={stage.completionPercentage} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Recent progress updates</div>
                        <QuickLink to="/progress" icon={TrendingUp}>View updates</QuickLink>
                    </div>
                    {data.progressUpdates.length === 0 ? (
                        <EmptyState title="No progress updates yet" description="Recorded site updates will appear here." />
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {data.progressUpdates.slice(0, 5).map(update => (
                                <div key={update.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <strong>{update.projectName || `Project ${update.projectId}`}</strong>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(update.updateDate)}</span>
                                    </div>
                                    <p style={{ margin: '6px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                                        {update.workCompletedToday || 'Progress update recorded'}
                                    </p>
                                    <ProgressBar percent={update.completionPercentage} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="card mt-24">
                <div className="card-title mb-16">Daily actions</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <QuickLink to="/stages" icon={ClipboardList}>Update a stage</QuickLink>
                    <QuickLink to="/attendance" icon={ClipboardCheck}>Record attendance</QuickLink>
                    <QuickLink to="/progress" icon={TrendingUp}>Add progress update</QuickLink>
                    <QuickLink to="/expenses" icon={FileText}>Record expense</QuickLink>
                </div>
            </section>
        </DashboardState>
    );
}

export function StoreDashboard() {
    const loadData = useCallback(async (signal) => {
        const [materialsResponse, lowStockResponse, transactionsResponse] = await Promise.all([
            materialsApi.getAll({ page: 1, pageSize: 5 }, { signal }),
            materialsApi.getAll({ stockStatus: 'low', page: 1, pageSize: 5 }, { signal }),
            transactionsApi.getAll({}, { signal }),
        ]);
        return {
            materialCount: materialsResponse.data.totalCount,
            materials: materialsResponse.data.items,
            lowStockCount: lowStockResponse.data.totalCount,
            lowStockMaterials: lowStockResponse.data.items,
            transactions: transactionsResponse.data.slice(0, 5),
            transactionCount: transactionsResponse.data.length,
        };
    }, []);
    const { data, loading, error } = useRoleDashboard(loadData);
    if (loading || error || !data) {
        return <DashboardState data={data} loading={loading} error={error} onRetry={() => window.location.reload()} />;
    }

    return (
        <DashboardState data={data} loading={loading} error={error} onRetry={() => window.location.reload()}>
            <PageHeader title="Store Manager Dashboard" subtitle="Inventory levels and recent stock activity" />
            <div className="stats-grid mb-24">
                <StatCard label="Active materials" value={data.materialCount} icon={Package} subValue="Items in inventory" />
                <StatCard
                    label="Low-stock materials"
                    value={data.lowStockCount}
                    icon={AlertTriangle}
                    iconBg={data.lowStockCount ? '#fee2e2' : '#d1fae5'}
                    iconColor={data.lowStockCount ? '#dc2626' : '#059669'}
                    subValue={data.lowStockCount ? 'Restock may be needed' : 'Stock levels look good'}
                />
                <StatCard label="Stock transactions" value={data.transactionCount} icon={RefreshCw} subValue="Recorded inventory movements" />
            </div>

            <div className="charts-grid">
                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Low-stock alerts</div>
                        <QuickLink to="/materials" icon={Package}>Manage inventory</QuickLink>
                    </div>
                    {data.lowStockMaterials.length === 0 ? (
                        <EmptyState title="No low-stock materials" description="Materials below their minimum stock threshold will appear here." />
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {data.lowStockMaterials.map(material => (
                                <div key={material.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                                    <div>
                                        <strong>{material.name}</strong>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{material.category}</div>
                                    </div>
                                    <span className="status-badge badge-red">
                                        {material.currentStock} {material.unit} / min {material.minimumStockThreshold}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Recent stock transactions</div>
                        <QuickLink to="/materials" icon={RefreshCw}>Open transactions</QuickLink>
                    </div>
                    {data.transactions.length === 0 ? (
                        <EmptyState title="No stock transactions yet" description="Stock-in and stock-out activity will appear here." />
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {data.transactions.map(transaction => (
                                <div key={transaction.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                                    <div>
                                        <strong>{transaction.materialName}</strong>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(transaction.transactionDate)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <StatusBadge status={transaction.transactionType} />
                                        <div style={{ fontSize: 12, marginTop: 4 }}>{transaction.quantity}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="card mt-24">
                <div className="card-title mb-16">Inventory actions</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <QuickLink to="/materials" icon={Package}>View materials</QuickLink>
                    <QuickLink to="/materials" icon={RefreshCw}>Record stock-in or stock-out</QuickLink>
                </div>
            </section>
        </DashboardState>
    );
}
