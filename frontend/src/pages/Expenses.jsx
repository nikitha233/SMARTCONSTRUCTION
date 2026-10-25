import { useEffect, useState } from 'react';
import { expensesApi, projectsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { LoadingSpinner, EmptyState, ConfirmDialog, Modal, PageHeader, FormField } from '../components/UI';
import { Plus, Search, Pencil, Trash2, DollarSign, CreditCard, Calendar, Filter } from 'lucide-react';

const CATEGORIES = [
    'Materials',
    'Labor',
    'Equipment',
    'Subcontractor',
    'PermitsAndLegal',
    'Overhead',
    'Miscellaneous'
];

const PAYMENT_METHODS = ['BankTransfer', 'Cheque', 'Cash', 'UPI'];

const getCategoryBadgeStyle = (cat) => {
    switch (cat?.toLowerCase()) {
        case 'materials': return { background: '#e0f2fe', color: '#0369a1' };
        case 'labour':
        case 'labor': return { background: '#dcfce7', color: '#15803d' };
        case 'equipment':
        case 'equipment rental': return { background: '#fef3c7', color: '#b45309' };
        case 'transportation': return { background: '#f3e8ff', color: '#7e22ce' };
        case 'subcontractor': return { background: '#ffedd5', color: '#c2410c' };
        default: return { background: '#f3f4f6', color: '#374151' };
    }
};

const emptyForm = {
    projectId: '',
    category: 'Materials',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BankTransfer',
    referenceNumber: '',
};

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editExpense, setEditExpense] = useState(null);
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

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const params = {};
            if (selectedProject) params.projectId = selectedProject;
            if (categoryFilter) params.category = categoryFilter;
            const res = await expensesApi.getAll(params);
            setExpenses(res.data);
        } catch {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        loadExpenses();
    }, [selectedProject, categoryFilter]);

    const openCreate = () => {
        setEditExpense(null);
        setForm({
            ...emptyForm,
            projectId: selectedProject || (projects[0]?.id ? String(projects[0].id) : '')
        });
        setModalOpen(true);
    };

    const openEdit = (e) => {
        setEditExpense(e);
        setForm({
            projectId: String(e.projectId),
            category: e.category,
            description: e.description,
            amount: e.amount,
            expenseDate: e.expenseDate ? e.expenseDate.slice(0, 10) : '',
            paymentMethod: e.paymentMethod || 'BankTransfer',
            referenceNumber: e.referenceNumber || '',
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.projectId) {
            toast.warning('Please select a project');
            return;
        }
        if (!form.description.trim()) {
            toast.warning('Description is required');
            return;
        }
        if (!form.amount || Number(form.amount) <= 0) {
            toast.warning('Valid expense amount is required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                projectId: Number(form.projectId),
                amount: Number(form.amount),
                expenseDate: new Date(form.expenseDate).toISOString(),
            };

            if (editExpense) {
                await expensesApi.update(editExpense.id, payload);
                toast.success('Expense updated');
            } else {
                await expensesApi.create(payload);
                toast.success('Expense recorded');
            }
            setModalOpen(false);
            loadExpenses();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save expense');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await expensesApi.delete(deleteId);
            toast.success('Expense deleted');
            setDeleteId(null);
            loadExpenses();
        } catch {
            toast.error('Failed to delete expense');
        }
    };

    const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return (
        <div>
            <PageHeader
                title="Project Expenditure"
                subtitle="Track material disbursements, vendor invoices, labor billing, and contractor claims"
            >
                {isAdminOrManager() && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Record Expense
                    </button>
                )}
            </PageHeader>

            {/* Top Stat Summary */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Filtered Expenditure Total:</span>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0 0' }}>
                        {formatCurrency(totalExpense)}
                    </h2>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Showing {expenses.length} transaction records
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 240 }}>
                    <select
                        className="form-control"
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                    >
                        <option value="">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ minWidth: 200 }}>
                    <select
                        className="form-control"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : expenses.length === 0 ? (
                <EmptyState
                    icon={<DollarSign size={48} color="var(--text-muted)" />}
                    title="No expenses found"
                    description="Record invoices, fuel vouchers, cement purchases, and subcontract bills."
                    action={
                        isAdminOrManager() && (
                            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
                                <Plus size={16} /> Record Expense
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
                                    <th>Project</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Payment Details</th>
                                    <th>Date</th>
                                    <th>Recorded By</th>
                                    {isAdminOrManager() && <th style={{ textAlign: 'right' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(exp => (
                                    <tr key={exp.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exp.projectName}</div>
                                        </td>
                                        <td>
                                            <span className="status-badge" style={{ ...getCategoryBadgeStyle(exp.category), fontWeight: 700 }}>
                                                {exp.category || 'General'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{exp.description}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 14 }}>
                                                {formatCurrency(exp.amount)}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {exp.paymentMethod} {exp.referenceNumber && `• Ref: ${exp.referenceNumber}`}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13 }}>{formatDate(exp.expenseDate)}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp.recordedBy || 'System'}</div>
                                        </td>
                                        {isAdminOrManager() && (
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon" title="Edit" onClick={() => openEdit(exp)}>
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(exp.id)}>
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

            {/* Expense Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editExpense ? 'Edit Expenditure' : 'Record Project Expense'}
                maxWidth={580}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" form="expenseForm" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : editExpense ? 'Save Changes' : 'Record Expense'}
                        </button>
                    </div>
                }
            >
                <form id="expenseForm" onSubmit={handleSave}>
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

                        <FormField label="Category" required>
                            <select
                                className="form-control"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                required
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="grid-2">
                        <FormField label="Amount (INR)" required>
                            <input
                                type="number"
                                min="1"
                                step="any"
                                className="form-control"
                                placeholder="e.g. 150000"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                                required
                            />
                        </FormField>

                        <FormField label="Expense Date" required>
                            <input
                                type="date"
                                className="form-control"
                                value={form.expenseDate}
                                onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <FormField label="Description / Invoice Subject" required>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. 50 MT TMT Rebar delivery from Tata Tiscon"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            required
                        />
                    </FormField>

                    <div className="grid-2">
                        <FormField label="Payment Method">
                            <select
                                className="form-control"
                                value={form.paymentMethod}
                                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                            >
                                {PAYMENT_METHODS.map(m => (
                                    <option key={m} value={m}>{m.replace(/([A-Z])/g, ' $1').trim()}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Voucher / Cheque / UTR Ref">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. CHQ-991201 or UTR-20261025"
                                value={form.referenceNumber}
                                onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                            />
                        </FormField>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="Delete Expense"
                message="Are you sure you want to delete this expense record? The project total cost will automatically update."
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
