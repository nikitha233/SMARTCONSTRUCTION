import { useEffect, useState } from 'react';
import { materialsApi, transactionsApi, projectsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, LoadingSpinner, EmptyState, ConfirmDialog, Modal, PageHeader } from '../components/UI';
import { Plus, Search, Package, AlertTriangle, RefreshCw } from 'lucide-react';

const CATEGORIES = ['Binding Material', 'Structural', 'Masonry', 'Aggregate', 'Finishing', 'Electrical', 'Plumbing', 'Flooring', 'Wood Work', 'Other'];
const TXN_TYPES = ['Purchase', 'Consumption', 'Adjustment', 'Return'];

export default function Materials() {
    const [materials, setMaterials] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [matModal, setMatModal] = useState(false);
    const [txnModal, setTxnModal] = useState(false);
    const [txnHistory, setTxnHistory] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedMat, setSelectedMat] = useState(null);
    const [editMat, setEditMat] = useState(null);
    const [matForm, setMatForm] = useState({});
    const [txnForm, setTxnForm] = useState({ materialId: '', projectId: '', transactionType: 'Purchase', quantity: '', unitCost: '', transactionDate: new Date().toISOString().slice(0, 10), notes: '' });
    const [saving, setSaving] = useState(false);
    const toast = useToast();
    const { hasRole } = useAuth();
    const canManage = hasRole('Admin', 'StoreManager');

    const load = () => {
        setLoading(true);
        Promise.all([
            materialsApi.getAll({ search, category: catFilter, stockStatus: stockFilter }),
            projectsApi.getAll(),
        ]).then(([m, p]) => { setMaterials(m.data); setProjects(p.data); })
            .catch(() => toast.error('Failed to load data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [search, catFilter, stockFilter]);

    const openTxn = (mat) => {
        setSelectedMat(mat);
        setTxnForm(f => ({ ...f, materialId: mat.id, unitCost: mat.unitCost }));
        setTxnModal(true);
    };

    const openHistory = async (mat) => {
        setSelectedMat(mat);
        const r = await materialsApi.getTransactions(mat.id);
        setTxnHistory(r.data);
        setHistoryOpen(true);
    };

    const openCreate = () => { setEditMat(null); setMatForm({ name: '', category: '', unit: '', minimumStockThreshold: 0, unitCost: 0, supplier: '', storageLocation: '' }); setMatModal(true); };
    const openEdit = (m) => { setEditMat(m); setMatForm({ name: m.name, category: m.category, unit: m.unit, minimumStockThreshold: m.minimumStockThreshold, unitCost: m.unitCost, supplier: m.supplier, storageLocation: m.storageLocation, isActive: m.isActive }); setMatModal(true); };

    const saveMaterial = async () => {
        setSaving(true);
        try {
            if (editMat) await materialsApi.update(editMat.id, matForm);
            else await materialsApi.create(matForm);
            toast.success(editMat ? 'Material updated' : 'Material added');
            setMatModal(false); load();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const saveTxn = async () => {
        if (!txnForm.quantity || txnForm.quantity <= 0) { toast.error('Enter a valid quantity'); return; }
        setSaving(true);
        try {
            await transactionsApi.create({ ...txnForm, quantity: parseFloat(txnForm.quantity), unitCost: parseFloat(txnForm.unitCost || 0), projectId: txnForm.projectId || null });
            toast.success('Transaction recorded successfully');
            setTxnModal(false); load();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to record transaction'); }
        finally { setSaving(false); }
    };

    return (
        <div>
            <PageHeader title="Materials" subtitle={`${materials.length} materials · ${materials.filter(m => m.currentStock <= m.minimumStockThreshold).length} low stock`}>
                {canManage && (
                    <>
                        <button className="btn btn-outline btn-sm" onClick={() => setTxnModal(true)}><RefreshCw size={15} /> New Transaction</button>
                        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Material</button>
                    </>
                )}
            </PageHeader>

            <div className="filter-bar">
                <div className="search-input">
                    <Search size={16} color="var(--text-muted)" />
                    <input placeholder="Search materials…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="filter-select" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                    <option value="">All Stock</option>
                    <option value="low">Low Stock Only</option>
                </select>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="card">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Material</th><th>Category</th><th>Stock</th><th>Min. Threshold</th><th>Unit Cost</th><th>Total Value</th><th>Supplier</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {materials.length === 0 ? (
                                    <tr><td colSpan={9}><EmptyState icon={<Package size={40} />} title="No materials found" /></td></tr>
                                ) : materials.map(m => {
                                    const isLow = m.currentStock <= m.minimumStockThreshold;
                                    return (
                                        <tr key={m.id}>
                                            <td><div style={{ fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.unit}</div></td>
                                            <td>{m.category}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {isLow && <AlertTriangle size={14} color="var(--warning)" />}
                                                    <span style={{ fontWeight: 700, color: isLow ? 'var(--danger)' : 'inherit' }}>{m.currentStock}</span>
                                                </div>
                                            </td>
                                            <td>{m.minimumStockThreshold}</td>
                                            <td>{formatCurrency(m.unitCost)}</td>
                                            <td>{formatCurrency(m.currentStock * m.unitCost)}</td>
                                            <td>{m.supplier}</td>
                                            <td><StatusBadge status={isLow ? 'Low' : 'Adequate'} /></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {canManage && <button className="btn btn-accent btn-sm" onClick={() => openTxn(m)}>Transaction</button>}
                                                    <button className="btn btn-outline btn-sm" onClick={() => openHistory(m)}>History</button>
                                                    {canManage && <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Material Modal */}
            <Modal isOpen={matModal} onClose={() => setMatModal(false)} title={editMat ? 'Edit Material' : 'Add Material'}
                footer={<><button className="btn btn-outline" onClick={() => setMatModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveMaterial} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}
            >
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-control" value={matForm.name || ''} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Category</label>
                        <select className="form-control" value={matForm.category || ''} onChange={e => setMatForm(f => ({ ...f, category: e.target.value }))}>
                            <option value="">Select…</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Unit</label><input className="form-control" value={matForm.unit || ''} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} placeholder="Bags, MT, Nos…" /></div>
                    <div className="form-group"><label className="form-label">Min. Threshold</label><input type="number" className="form-control" value={matForm.minimumStockThreshold || 0} onChange={e => setMatForm(f => ({ ...f, minimumStockThreshold: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Unit Cost (₹)</label><input type="number" className="form-control" value={matForm.unitCost || 0} onChange={e => setMatForm(f => ({ ...f, unitCost: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Supplier</label><input className="form-control" value={matForm.supplier || ''} onChange={e => setMatForm(f => ({ ...f, supplier: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Storage Location</label><input className="form-control" value={matForm.storageLocation || ''} onChange={e => setMatForm(f => ({ ...f, storageLocation: e.target.value }))} /></div>
            </Modal>

            {/* Transaction Modal */}
            <Modal isOpen={txnModal} onClose={() => { setTxnModal(false); setSelectedMat(null); }}
                title={selectedMat ? `Transaction: ${selectedMat.name}` : 'New Transaction'}
                footer={<><button className="btn btn-outline" onClick={() => setTxnModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveTxn} disabled={saving}>{saving ? 'Saving…' : 'Record'}</button></>}
            >
                {!selectedMat && (
                    <div className="form-group">
                        <label className="form-label">Material *</label>
                        <select className="form-control" value={txnForm.materialId} onChange={e => { setTxnForm(f => ({ ...f, materialId: e.target.value })); }}>
                            <option value="">Select material…</option>
                            {materials.map(m => <option key={m.id} value={m.id}>{m.name} (Stock: {m.currentStock})</option>)}
                        </select>
                    </div>
                )}
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Type</label>
                        <select className="form-control" value={txnForm.transactionType} onChange={e => setTxnForm(f => ({ ...f, transactionType: e.target.value }))}>
                            {TXN_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Quantity *</label><input type="number" min={0} step="0.001" className="form-control" value={txnForm.quantity} onChange={e => setTxnForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label className="form-label">Unit Cost (₹)</label><input type="number" min={0} className="form-control" value={txnForm.unitCost} onChange={e => setTxnForm(f => ({ ...f, unitCost: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-control" value={txnForm.transactionDate} onChange={e => setTxnForm(f => ({ ...f, transactionDate: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Project (optional)</label>
                    <select className="form-control" value={txnForm.projectId} onChange={e => setTxnForm(f => ({ ...f, projectId: e.target.value }))}>
                        <option value="">None</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={txnForm.notes} onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </Modal>

            {/* Transaction History Modal */}
            <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title={`Transaction History: ${selectedMat?.name}`} maxWidth={720}>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Unit Cost</th><th>Total</th><th>Project</th><th>By</th></tr></thead>
                        <tbody>
                            {txnHistory.map(t => (
                                <tr key={t.id}>
                                    <td>{formatDate(t.transactionDate)}</td>
                                    <td><StatusBadge status={t.transactionType} /></td>
                                    <td>{t.quantity}</td>
                                    <td>{formatCurrency(t.unitCost)}</td>
                                    <td>{formatCurrency(t.totalCost)}</td>
                                    <td>{t.projectName || '—'}</td>
                                    <td>{t.recordedBy}</td>
                                </tr>
                            ))}
                            {txnHistory.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No transactions recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
}
