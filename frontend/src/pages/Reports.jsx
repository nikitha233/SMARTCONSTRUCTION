import { useEffect, useState } from 'react';
import { reportsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, downloadCSV } from '../utils/helpers';
import { LoadingSpinner, PageHeader, StatusBadge } from '../components/UI';
import { FileText, Download, Printer, Filter, Calendar, CheckCircle, Package, Truck, Users, DollarSign } from 'lucide-react';

const TABS = [
    { id: 'projects', label: 'CPWD Project Summary', icon: FileText },
    { id: 'inventory', label: 'Inventory & Materials', icon: Package },
    { id: 'expenses', label: 'Financial Expenditure', icon: DollarSign },
    { id: 'attendance', label: 'Labor Muster Roll', icon: Users },
    { id: 'equipment', label: 'Equipment Utilization', icon: Truck },
];

export default function Reports() {
    const [activeTab, setActiveTab] = useState('projects');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchReport = async (tab) => {
        setLoading(true);
        setData(null);
        try {
            let res;
            if (tab === 'projects') res = await reportsApi.projectSummary();
            else if (tab === 'inventory') res = await reportsApi.inventory();
            else if (tab === 'expenses') res = await reportsApi.expenses();
            else if (tab === 'attendance') res = await reportsApi.attendance();
            else if (tab === 'equipment') res = await reportsApi.equipmentUtilization();

            setData(res?.data);
        } catch {
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport(activeTab);
    }, [activeTab]);

    const handleExportCSV = () => {
        if (!data) return;
        let exportRows = [];
        let filename = `${activeTab}-report-${new Date().toISOString().slice(0, 10)}.csv`;

        if (activeTab === 'projects') {
            exportRows = (Array.isArray(data) ? data : []).map(p => ({
                'Project Code': p.projectCode,
                'Project Name': p.name,
                'Client': p.clientName,
                'Status': p.status,
                'Completion (%)': p.completionPercentage,
                'Estimated Budget (INR)': p.estimatedBudget,
                'Actual Cost (INR)': p.actualCost,
                'Remaining Budget (INR)': p.remainingBudget,
                'Budget Utilization (%)': p.budgetUtilization,
                'Start Date': p.startDate?.slice(0, 10),
                'Planned Completion': p.plannedCompletionDate?.slice(0, 10),
            }));
        } else if (activeTab === 'inventory') {
            exportRows = (Array.isArray(data) ? data : []).map(m => ({
                'Material Name': m.name,
                'Category': m.category,
                'Unit': m.unit,
                'Current Stock': m.currentStock,
                'Minimum Threshold': m.minimumStockThreshold,
                'Unit Cost (INR)': m.unitCost,
                'Total Valuation (INR)': m.totalValue,
                'Stock Status': m.stockStatus,
                'Supplier': m.supplier,
                'Storage Location': m.storageLocation,
            }));
        } else if (activeTab === 'expenses') {
            exportRows = (data.expenses || []).map(e => ({
                'Expense ID': e.id,
                'Project': e.project?.name || e.projectName,
                'Category': e.category,
                'Description': e.description,
                'Amount (INR)': e.amount,
                'Payment Method': e.paymentMethod,
                'Reference': e.referenceNumber,
                'Date': e.expenseDate?.slice(0, 10),
                'Recorded By': e.recordedBy,
            }));
        } else if (activeTab === 'attendance') {
            exportRows = (data.summary || []).map(s => ({
                'Worker ID': s.workerId,
                'Worker Name': s.workerName,
                'Total Days Recorded': s.totalDays,
                'Present Days': s.presentDays,
                'Half Days': s.halfDays,
                'Absent Days': s.absentDays,
                'Total Wages Paid (INR)': s.totalWage,
            }));
        } else if (activeTab === 'equipment') {
            exportRows = (Array.isArray(data) ? data : []).map(eq => ({
                'Equipment Code': eq.equipmentCode,
                'Name': eq.name,
                'Category': eq.category,
                'Availability': eq.availability,
                'Total Deployments': eq.totalAssignments,
                'Active Sites': eq.activeAssignments,
                'Next Maintenance': eq.nextMaintenanceDate?.slice(0, 10),
                'Service Due': eq.maintenanceDue ? 'YES' : 'NO',
            }));
        }

        downloadCSV(exportRows, filename);
        toast.success(`Exported ${exportRows.length} records to ${filename}`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <PageHeader
                title="Engineering Reports & Exports"
                subtitle="CPWD daily site summaries, statutory audits, inventory registers, and labor billing"
            >
                <button className="btn btn-outline" onClick={handlePrint}>
                    <Printer size={15} /> Print Report
                </button>
                <button className="btn btn-primary" onClick={handleExportCSV} disabled={loading || !data}>
                    <Download size={15} /> Export to Excel (CSV)
                </button>
            </PageHeader>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid var(--border)', marginBottom: 20, overflowX: 'auto' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 700 : 500,
                            cursor: 'pointer',
                            fontSize: 14,
                            whiteSpace: 'nowrap',
                            marginBottom: -2,
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : !data ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No report data available.
                </div>
            ) : (
                <div>
                    {/* TAB 1: CPWD Projects Summary */}
                    {activeTab === 'projects' && Array.isArray(data) && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Project & Client</th>
                                            <th>Status</th>
                                            <th>Physical Progress</th>
                                            <th>Approved Budget</th>
                                            <th>Actual Expenditure</th>
                                            <th>Variance Balance</th>
                                            <th>Stages</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{p.projectCode}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Client: {p.clientName}</div>
                                                </td>
                                                <td><StatusBadge status={p.status} /></td>
                                                <td style={{ fontWeight: 700 }}>{p.completionPercentage}%</td>
                                                <td>{formatCurrency(p.estimatedBudget)}</td>
                                                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.actualCost)}</td>
                                                <td style={{ fontWeight: 700, color: p.remainingBudget >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {formatCurrency(p.remainingBudget)}
                                                </td>
                                                <td style={{ fontSize: 13 }}>{p.completedStages} / {p.stageCount} done</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Inventory & Materials */}
                    {activeTab === 'inventory' && Array.isArray(data) && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Material Name</th>
                                            <th>Category</th>
                                            <th>Available Stock</th>
                                            <th>Threshold</th>
                                            <th>Unit Cost</th>
                                            <th>Total Stock Value</th>
                                            <th>Status</th>
                                            <th>Supplier</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map(m => (
                                            <tr key={m.id}>
                                                <td style={{ fontWeight: 600 }}>{m.name}</td>
                                                <td><span className="badge" style={{ background: '#f0fdf4', color: '#166534' }}>{m.category}</span></td>
                                                <td style={{ fontWeight: 700 }}>{m.currentStock} {m.unit}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{m.minimumStockThreshold} {m.unit}</td>
                                                <td>{formatCurrency(m.unitCost)}</td>
                                                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(m.totalValue)}</td>
                                                <td>
                                                    <span className={`status-badge ${m.stockStatus === 'Low' ? 'badge-red' : 'badge-green'}`}>
                                                        {m.stockStatus}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.supplier || 'Direct Mill'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Expenses */}
                    {activeTab === 'expenses' && data && (
                        <div>
                            <div className="card" style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aggregated Expenditure:</span>
                                    <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0 0' }}>
                                        {formatCurrency(data.total)}
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    {(data.byCategory || []).map(cat => (
                                        <div key={cat.category} style={{ fontSize: 12 }}>
                                            <div style={{ color: 'var(--text-muted)' }}>{cat.category}</div>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(cat.total)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Project</th>
                                                <th>Category</th>
                                                <th>Description</th>
                                                <th>Amount</th>
                                                <th>Payment Method</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data.expenses || []).map(exp => (
                                                <tr key={exp.id}>
                                                    <td style={{ fontWeight: 600 }}>{exp.project?.name || 'Project'}</td>
                                                    <td><span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>{exp.category}</span></td>
                                                    <td style={{ fontSize: 13 }}>{exp.description}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(exp.amount)}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{exp.paymentMethod}</td>
                                                    <td>{formatDate(exp.expenseDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Attendance Muster Roll */}
                    {activeTab === 'attendance' && data && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Worker Name</th>
                                            <th>Days Recorded</th>
                                            <th>Present Shifts</th>
                                            <th>Half Days</th>
                                            <th>Absent</th>
                                            <th>Attendance Ratio</th>
                                            <th>Total Wages Disbursed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.summary || []).map(s => {
                                            const ratio = s.totalDays > 0 ? Math.round(((s.presentDays + s.halfDays * 0.5) / s.totalDays) * 100) : 0;
                                            return (
                                                <tr key={s.workerId}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.workerName}</td>
                                                    <td>{s.totalDays} days</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{s.presentDays}</td>
                                                    <td style={{ color: 'var(--warning)' }}>{s.halfDays}</td>
                                                    <td style={{ color: 'var(--danger)' }}>{s.absentDays}</td>
                                                    <td style={{ fontWeight: 700 }}>{ratio}%</td>
                                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(s.totalWage)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Equipment Utilization */}
                    {activeTab === 'equipment' && Array.isArray(data) && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Asset Code</th>
                                            <th>Machinery Name</th>
                                            <th>Category</th>
                                            <th>Current Status</th>
                                            <th>Total Deployments</th>
                                            <th>Active Operations</th>
                                            <th>Next Maintenance</th>
                                            <th>Service Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map(eq => (
                                            <tr key={eq.id}>
                                                <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{eq.equipmentCode}</td>
                                                <td style={{ fontWeight: 600 }}>{eq.name}</td>
                                                <td><span className="badge" style={{ background: '#f0fdf4', color: '#166534' }}>{eq.category}</span></td>
                                                <td><StatusBadge status={eq.availability} /></td>
                                                <td>{eq.totalAssignments} projects</td>
                                                <td style={{ fontWeight: 600 }}>{eq.activeAssignments} active</td>
                                                <td>{formatDate(eq.nextMaintenanceDate)}</td>
                                                <td>
                                                    <span className={`status-badge ${eq.maintenanceDue ? 'badge-amber' : 'badge-green'}`}>
                                                        {eq.maintenanceDue ? 'Service Due' : 'Operational'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
