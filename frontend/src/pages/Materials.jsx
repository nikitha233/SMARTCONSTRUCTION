import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { materialsApi, transactionsApi, lookupApi } from '../services/api';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, SkeletonLoader, EmptyState, Modal, PageHeader, Pagination, DataTable, StatCard } from '../components/UI';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRequestController } from '../hooks/useRequestController';
import { useApi } from '../hooks/useApi';
import {
    Plus, Search, Package, AlertTriangle, RefreshCw, Download, DollarSign,
    Zap, ArrowDownLeft, ArrowUpRight, Building2, ClipboardList, ShoppingCart,
    Truck, FileText, CheckCircle2, Clock, Check, LayoutDashboard, BarChart2
} from 'lucide-react';

const TODAY_DATE = new Date().toISOString().slice(0, 10);

const CATEGORIES = [
    'Binding Material', 'Structural', 'Masonry', 'Aggregate',
    'Finishing', 'Electrical', 'Plumbing', 'Flooring', 'Wood Work', 'Other'
];

const TXN_TYPES = ['Purchase', 'Consumption', 'Adjustment', 'Return'];
const EMPTY_PAGE = { items: [], totalCount: 0 };

const INITIAL_REQUESTS = [
    { id: 'REQ-101', materialId: 6, materialName: 'Exterior Wall Paint', quantity: 80, unit: 'Litres', projectId: 1, projectName: 'Green Valley Residential Building', urgency: 'Urgent', status: 'Pending', requestedBy: 'Site Engineer Rohinin', date: '2026-10-26' },
    { id: 'REQ-102', materialId: 3, materialName: 'Cement (OPC 53 Grade)', quantity: 50, unit: 'Bags (50kg)', projectId: 1, projectName: 'Green Valley Residential Building', urgency: 'High', status: 'Approved', requestedBy: 'Site Engineer Rohinin', date: '2026-10-25' },
    { id: 'REQ-103', materialId: 1, materialName: 'Bricks (Red Clay)', quantity: 5000, unit: 'Nos', projectId: 1, projectName: 'Green Valley Residential Building', urgency: 'Normal', status: 'Fulfilled', requestedBy: 'Site Engineer Rohinin', date: '2026-10-24' },
];

const INITIAL_POS = [
    { poNumber: 'PO-2026-001', supplier: 'Asian Paints', materialName: 'Exterior Wall Paint', quantity: 150, unit: 'Litres', totalAmount: 48000, orderDate: '2026-10-26', expectedDate: '2026-10-29', status: 'Issued' },
    { poNumber: 'PO-2026-002', supplier: 'ACC Cement Ltd', materialName: 'Cement (OPC 53 Grade)', quantity: 200, unit: 'Bags (50kg)', totalAmount: 84000, orderDate: '2026-10-22', expectedDate: '2026-10-25', status: 'Delivered' },
    { poNumber: 'PO-2026-003', supplier: 'Local Brick Kiln', materialName: 'Bricks (Red Clay)', quantity: 10000, unit: 'Nos', totalAmount: 80000, orderDate: '2026-10-20', expectedDate: '2026-10-23', status: 'Delivered' },
];

const SUPPLIERS_CATALOG = [
    { name: 'Asian Paints', category: 'Finishing', material: 'Exterior Wall Paint, Primer', contact: 'Vikram Joshi', phone: '+91 98221 44332', email: 'orders@asianpaints-depot.com', leadTime: '2 Days', rating: '4.8' },
    { name: 'ACC Cement Ltd', category: 'Binding Material', material: 'Cement (OPC 53 Grade, PPC)', contact: 'Sanjay Deshmukh', phone: '+91 98450 11223', email: 'sales@acccement-north.com', leadTime: '1-2 Days', rating: '4.9' },
    { name: 'Local Brick Kiln', category: 'Masonry', material: 'Red Clay Bricks, Fly Ash Bricks', contact: 'Ramesh Patel', phone: '+91 97654 32109', email: 'ramesh.kiln@gmail.com', leadTime: '3 Days', rating: '4.6' },
    { name: 'Astral Pipes', category: 'Plumbing', material: 'CPVC & UPVC Pipes, Fittings', contact: 'Manoj Shah', phone: '+91 99887 65432', email: 'dispatch@astralpipes-dist.in', leadTime: '2 Days', rating: '4.7' },
    { name: 'Quarry Works Ltd', category: 'Aggregate', material: 'Coarse Aggregate (20mm, 10mm)', contact: 'Dinesh Yadav', phone: '+91 94220 77889', email: 'quarry.crusher@works.co.in', leadTime: '1 Day', rating: '4.5' },
    { name: 'Havells India', category: 'Electrical', material: 'Electrical Cables, Conduits, DBs', contact: 'Rajesh Mehra', phone: '+91 98110 33445', email: 'corporate@havells-supply.com', leadTime: '3-4 Days', rating: '4.9' },
    { name: 'Johnson Tiles', category: 'Flooring', material: 'Vitrified & Ceramic Tiles (600x600)', contact: 'Amit Roy', phone: '+91 98300 55667', email: 'commercial@johnsontiles.co.in', leadTime: '4-5 Days', rating: '4.7' },
    { name: 'Century Plywoods', category: 'Wood Work', material: 'BWR Grade Plywood, Flush Doors', contact: 'Karthik Rao', phone: '+91 98440 99881', email: 'timber@centuryply-sales.com', leadTime: '3 Days', rating: '4.8' },
];

export default function Materials() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTabState] = useState(tabParam || 'overview');

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams(tab === 'overview' ? {} : { tab });
    };

    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTabState(tabParam);
        }
    }, [tabParam, activeTab]);

    const [projects, setProjects] = useState([]);
    const [allTxns, setAllTxns] = useState([]);
    const [loadingTxns, setLoadingTxns] = useState(false);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [txnTypeFilter, setTxnTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebouncedValue(search);
    const pageSize = 20;

    const createRequestController = useRequestController();
    const historyControllerRef = useRef(null);

    // Modals
    const [matModal, setMatModal] = useState(false);
    const [txnModal, setTxnModal] = useState(false);
    const [txnHistory, setTxnHistory] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedMat, setSelectedMat] = useState(null);
    const [editMat, setEditMat] = useState(null);
    const [matForm, setMatForm] = useState({});
    const [txnForm, setTxnForm] = useState({
        materialId: '', projectId: '', transactionType: 'Purchase',
        quantity: '', unitCost: '', transactionDate: TODAY_DATE, notes: ''
    });
    const [saving, setSaving] = useState(false);

    // Inline Stock In & Stock Out Quick Entry States
    const [inlineStockIn, setInlineStockIn] = useState({
        materialId: '', supplier: '', quantity: '', unitCost: '', transactionDate: TODAY_DATE, notes: ''
    });
    const [inlineStockOut, setInlineStockOut] = useState({
        materialId: '', projectId: '', quantity: '', transactionDate: TODAY_DATE, notes: ''
    });
    const [inlineSaving, setInlineSaving] = useState(false);

    // Material Requests & POs
    const [requests, setRequests] = useState(() => {
        try {
            const saved = localStorage.getItem('buildsmart_material_requests');
            return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
        } catch { return INITIAL_REQUESTS; }
    });
    const [reqModal, setReqModal] = useState(false);
    const [reqForm, setReqForm] = useState({ materialId: '', quantity: '', urgency: 'High', notes: '' });

    const [purchaseOrders, setPurchaseOrders] = useState(() => {
        try {
            const saved = localStorage.getItem('buildsmart_purchase_orders');
            return saved ? JSON.parse(saved) : INITIAL_POS;
        } catch { return INITIAL_POS; }
    });
    const [poModal, setPoModal] = useState(false);
    const [poForm, setPoForm] = useState({ supplier: '', materialId: '', quantity: '', expectedDate: TODAY_DATE, notes: '' });

    const toast = useToast();
    const { hasRole, user } = useAuth();
    const canManage = hasRole('Admin', 'StoreManager');

    // Fetch materials
    const fetchMaterials = useCallback(async (signal) => {
        const response = await materialsApi.getAll({
            search: debouncedSearch, category: catFilter, stockStatus: stockFilter, page, pageSize
        }, { signal });
        return { items: response.data.items, totalCount: response.data.totalCount };
    }, [catFilter, debouncedSearch, page, pageSize, stockFilter]);

    const { data: materialPage, loading, error, refetch } = useApi(fetchMaterials, { initialData: EMPTY_PAGE });
    const materials = materialPage.items;
    const totalCount = materialPage.totalCount;

    useEffect(() => {
        if (error) toast.error('Failed to load data');
    }, [error, toast]);

    // Fetch lookup projects
    useEffect(() => {
        const controller = createRequestController();
        lookupApi.getAll({ signal: controller.signal })
            .then(r => setProjects(r.data.projects))
            .catch(() => { if (!controller.signal.aborted) toast.error('Failed to load projects'); });
        return () => controller.abort();
    }, [createRequestController, toast]);

    // Fetch all transactions for history & allocation analytics
    const loadAllTransactions = useCallback(() => {
        setLoadingTxns(true);
        transactionsApi.getAll()
            .then(res => setAllTxns(res.data))
            .catch(() => {})
            .finally(() => setLoadingTxns(false));
    }, []);

    useEffect(() => {
        loadAllTransactions();
    }, [loadAllTransactions]);

    // Save requests/POs to localStorage
    useEffect(() => {
        try { localStorage.setItem('buildsmart_material_requests', JSON.stringify(requests)); } catch {}
    }, [requests]);

    useEffect(() => {
        try { localStorage.setItem('buildsmart_purchase_orders', JSON.stringify(purchaseOrders)); } catch {}
    }, [purchaseOrders]);

    // Calculations
    const totalInventoryValue = useMemo(() =>
        materials.reduce((sum, m) => sum + (Number(m.currentStock) * Number(m.unitCost || 0)), 0)
    , [materials]);

    const lowStockMaterials = useMemo(() =>
        materials.filter(m => m.currentStock <= m.minimumStockThreshold)
    , [materials]);

    const projectAllocations = useMemo(() => {
        const map = {};
        allTxns.filter(t => t.transactionType === 'Consumption' && t.projectId).forEach(t => {
            const pId = t.projectId;
            if (!map[pId]) {
                map[pId] = {
                    projectId: pId,
                    projectName: t.projectName || `Project #${pId}`,
                    totalSpent: 0,
                    items: {}
                };
            }
            map[pId].totalSpent += Number(t.totalCost || 0);
            const mName = t.materialName || `Material #${t.materialId}`;
            map[pId].items[mName] = (map[pId].items[mName] || 0) + Number(t.quantity);
        });
        return Object.values(map);
    }, [allTxns]);

    const categoryStats = useMemo(() => {
        const stats = {};
        CATEGORIES.forEach(c => { stats[c] = { count: 0, totalVal: 0, lowStock: 0 }; });
        materials.forEach(m => {
            const cat = m.category || 'Other';
            if (!stats[cat]) stats[cat] = { count: 0, totalVal: 0, lowStock: 0 };
            stats[cat].count += 1;
            stats[cat].totalVal += (Number(m.currentStock) || 0) * (Number(m.unitCost) || 0);
            if (m.currentStock <= m.minimumStockThreshold) {
                stats[cat].lowStock += 1;
            }
        });
        return stats;
    }, [materials]);

    // Operations
    const openStockIn = (mat = null) => {
        setSelectedMat(mat);
        setTxnForm({
            materialId: mat ? mat.id : (materials[0]?.id || ''),
            projectId: '',
            transactionType: 'Purchase',
            quantity: mat && mat.currentStock < mat.minimumStockThreshold ? (mat.minimumStockThreshold - mat.currentStock) : '',
            unitCost: mat ? mat.unitCost : (materials[0]?.unitCost || 0),
            transactionDate: TODAY_DATE,
            notes: mat?.supplier ? `Delivery from ${mat.supplier}` : 'Stock In delivery'
        });
        setTxnModal(true);
    };

    const openStockOut = (mat = null, projId = '') => {
        setSelectedMat(mat);
        setTxnForm({
            materialId: mat ? mat.id : (materials[0]?.id || ''),
            projectId: projId || projects[0]?.id || '',
            transactionType: 'Consumption',
            quantity: '',
            unitCost: mat ? mat.unitCost : (materials[0]?.unitCost || 0),
            transactionDate: TODAY_DATE,
            notes: 'Site issue and consumption'
        });
        setTxnModal(true);
    };

    const openRestock = (mat) => {
        const deficit = Math.max(1, mat.minimumStockThreshold - mat.currentStock);
        setSelectedMat(mat);
        setTxnForm({
            materialId: mat.id,
            projectId: '',
            transactionType: 'Purchase',
            quantity: deficit,
            unitCost: mat.unitCost,
            transactionDate: TODAY_DATE,
            notes: `Restock deficit to meet minimum threshold (${mat.minimumStockThreshold} ${mat.unit})`,
        });
        setTxnModal(true);
    };

    const handleOneClickRestock = async (mat) => {
        const deficit = Math.max(1, mat.minimumStockThreshold - mat.currentStock);
        setSaving(true);
        try {
            await transactionsApi.create({
                materialId: mat.id,
                transactionType: 'Purchase',
                quantity: deficit,
                unitCost: mat.unitCost,
                transactionDate: TODAY_DATE,
                notes: `Instant deficit restock (${deficit} ${mat.unit}) to meet safety threshold`
            });
            toast.success(`Restocked ${deficit} ${mat.unit} of ${mat.name}`);
            refetch();
            loadAllTransactions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to restock');
        } finally {
            setSaving(false);
        }
    };

    const openHistory = async (mat) => {
        historyControllerRef.current?.abort();
        const controller = createRequestController();
        historyControllerRef.current = controller;
        setSelectedMat(mat);
        try {
            const r = await materialsApi.getTransactions(mat.id, { signal: controller.signal });
            setTxnHistory(r.data);
            setHistoryOpen(true);
        } catch {
            if (!controller.signal.aborted) toast.error('Failed to load transaction history');
        }
    };

    const openCreate = () => {
        setEditMat(null);
        setMatForm({ name: '', category: 'Binding Material', unit: 'Bags', minimumStockThreshold: 100, unitCost: 350, supplier: '', storageLocation: 'Warehouse Bay 1' });
        setMatModal(true);
    };

    const openEdit = (m) => {
        setEditMat(m);
        setMatForm({ name: m.name, category: m.category, unit: m.unit, minimumStockThreshold: m.minimumStockThreshold, unitCost: m.unitCost, supplier: m.supplier, storageLocation: m.storageLocation, isActive: m.isActive });
        setMatModal(true);
    };

    const saveMaterial = async () => {
        if (!matForm.name?.trim()) { toast.error('Material name is required'); return; }
        setSaving(true);
        try {
            if (editMat) await materialsApi.update(editMat.id, matForm);
            else await materialsApi.create(matForm);
            toast.success(editMat ? 'Material updated' : 'Material added');
            setMatModal(false); refetch();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const saveTxn = async () => {
        if (!txnForm.quantity || Number(txnForm.quantity) <= 0) { toast.error('Enter a valid quantity'); return; }
        if (!txnForm.materialId) { toast.error('Please select a material'); return; }
        setSaving(true);
        try {
            await transactionsApi.create({
                ...txnForm,
                quantity: parseFloat(txnForm.quantity),
                unitCost: parseFloat(txnForm.unitCost || 0),
                projectId: txnForm.projectId ? parseInt(txnForm.projectId) : null
            });
            toast.success(`${txnForm.transactionType} recorded successfully`);
            setTxnModal(false);
            refetch();
            loadAllTransactions();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to record transaction'); }
        finally { setSaving(false); }
    };

    // Quick inline Stock In submission
    const handleInlineStockInSubmit = async (e) => {
        e.preventDefault();
        if (!inlineStockIn.materialId) { toast.error('Please select a material'); return; }
        if (!inlineStockIn.quantity || Number(inlineStockIn.quantity) <= 0) { toast.error('Enter a valid quantity'); return; }
        setInlineSaving(true);
        try {
            await transactionsApi.create({
                materialId: parseInt(inlineStockIn.materialId),
                transactionType: 'Purchase',
                quantity: parseFloat(inlineStockIn.quantity),
                unitCost: parseFloat(inlineStockIn.unitCost || 0),
                transactionDate: inlineStockIn.transactionDate,
                notes: inlineStockIn.notes || (inlineStockIn.supplier ? `Delivered by ${inlineStockIn.supplier}` : 'Stock In delivery')
            });
            toast.success('Stock In recorded successfully');
            setInlineStockIn({ materialId: '', supplier: '', quantity: '', unitCost: '', transactionDate: TODAY_DATE, notes: '' });
            refetch();
            loadAllTransactions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record Stock In');
        } finally {
            setInlineSaving(false);
        }
    };

    // Quick inline Stock Out submission
    const handleInlineStockOutSubmit = async (e) => {
        e.preventDefault();
        if (!inlineStockOut.materialId) { toast.error('Please select a material'); return; }
        if (!inlineStockOut.quantity || Number(inlineStockOut.quantity) <= 0) { toast.error('Enter a valid quantity'); return; }
        const mat = materials.find(m => m.id === Number(inlineStockOut.materialId));
        if (mat && Number(inlineStockOut.quantity) > mat.currentStock) {
            toast.error(`Cannot stock out ${inlineStockOut.quantity} ${mat.unit}. Current stock is only ${mat.currentStock} ${mat.unit}.`);
            return;
        }
        setInlineSaving(true);
        try {
            await transactionsApi.create({
                materialId: parseInt(inlineStockOut.materialId),
                projectId: inlineStockOut.projectId ? parseInt(inlineStockOut.projectId) : null,
                transactionType: 'Consumption',
                quantity: parseFloat(inlineStockOut.quantity),
                unitCost: mat ? mat.unitCost : 0,
                transactionDate: inlineStockOut.transactionDate,
                notes: inlineStockOut.notes || 'Issued to construction site'
            });
            toast.success('Stock Out recorded successfully');
            setInlineStockOut({ materialId: '', projectId: '', quantity: '', transactionDate: TODAY_DATE, notes: '' });
            refetch();
            loadAllTransactions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record Stock Out');
        } finally {
            setInlineSaving(false);
        }
    };

    // Material Request handling
    const handleCreateRequest = (e) => {
        e.preventDefault();
        const mat = materials.find(m => m.id === Number(reqForm.materialId));
        if (!mat) { toast.error('Please select a material'); return; }
        const newReq = {
            id: `REQ-${Date.now().toString().slice(-4)}`,
            materialId: mat.id,
            materialName: mat.name,
            quantity: Number(reqForm.quantity),
            unit: mat.unit,
            projectId: projects[0]?.id || 1,
            projectName: projects[0]?.name || 'Active Project Site',
            urgency: reqForm.urgency,
            status: 'Pending',
            requestedBy: user?.fullName || 'Site Engineer',
            date: TODAY_DATE
        };
        setRequests([newReq, ...requests]);
        setReqModal(false);
        setReqForm({ materialId: '', quantity: '', urgency: 'High', notes: '' });
        toast.success(`Request ${newReq.id} submitted`);
    };

    const handleFulfillRequest = (req) => {
        const mat = materials.find(m => m.id === req.materialId);
        openStockOut(mat, req.projectId);
        setRequests(requests.map(r => r.id === req.id ? { ...r, status: 'Fulfilled' } : r));
    };

    // Purchase Order handling
    const handleCreatePO = (e) => {
        e.preventDefault();
        const mat = materials.find(m => m.id === Number(poForm.materialId));
        const newPo = {
            poNumber: `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
            supplier: poForm.supplier || mat?.supplier || 'Supplier',
            materialName: mat ? mat.name : 'Construction Materials',
            quantity: Number(poForm.quantity),
            unit: mat?.unit || 'Units',
            totalAmount: (mat?.unitCost || 500) * Number(poForm.quantity),
            orderDate: TODAY_DATE,
            expectedDate: poForm.expectedDate,
            status: 'Issued'
        };
        setPurchaseOrders([newPo, ...purchaseOrders]);
        setPoModal(false);
        setPoForm({ supplier: '', materialId: '', quantity: '', expectedDate: TODAY_DATE, notes: '' });
        toast.success(`Purchase Order ${newPo.poNumber} created`);
    };

    const handleReceivePO = (po) => {
        const mat = materials.find(m => m.name.toLowerCase().includes(po.materialName.toLowerCase()));
        openStockIn(mat);
        setPurchaseOrders(purchaseOrders.map(p => p.poNumber === po.poNumber ? { ...p, status: 'Delivered' } : p));
    };

    // Export to CSV
    const exportToCsv = () => {
        const headers = ['Material,Category,Unit,Current Stock,Min Threshold,Unit Cost (INR),Total Value (INR),Supplier,Storage Location,Status'];
        const rows = materials.map(m => [
            `"${m.name.replace(/"/g, '""')}"`,
            `"${m.category || ''}"`,
            `"${m.unit || ''}"`,
            m.currentStock,
            m.minimumStockThreshold,
            m.unitCost,
            m.currentStock * m.unitCost,
            `"${(m.supplier || '').replace(/"/g, '""')}"`,
            `"${(m.storageLocation || '').replace(/"/g, '""')}"`,
            m.currentStock <= m.minimumStockThreshold ? 'Low' : 'Adequate'
        ].join(','));
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Materials_Inventory_${TODAY_DATE}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Inventory report exported as CSV');
    };

    // All 11 Side Modules defined in exact user requested order
    const SIDEBAR_MODULES = [
        { id: 'overview', label: 'Material Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Material Inventory', icon: Package },
        { id: 'stock-in', label: 'Stock In', icon: ArrowDownLeft, color: '#059669' },
        { id: 'stock-out', label: 'Stock Out', icon: ArrowUpRight, color: '#d97706' },
        { id: 'requests', label: 'Material Requests', icon: ClipboardList, badge: requests.filter(r => r.status === 'Pending').length, badgeColor: '#f59e0b' },
        { id: 'suppliers', label: 'Suppliers', icon: Truck },
        { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
        { id: 'allocations', label: 'Project Material Allocation', icon: Building2 },
        { id: 'alerts', label: 'Low Stock Alerts', icon: AlertTriangle, badge: lowStockMaterials.length, badgeColor: '#ef4444' },
        { id: 'transactions', label: 'Transaction History', icon: FileText },
        { id: 'reports', label: 'Material Reports', icon: BarChart2 },
    ];

    return (
        <div>
            {/* Page Header with Action Shortcuts */}
            <PageHeader
                title="Materials Management Hub"
                subtitle="Overview, Inventory, Stock In/Out, Purchase Orders, Suppliers, and Allocations"
            >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={exportToCsv}>
                        <Download size={14} /> Export CSV
                    </button>
                    {canManage && (
                        <>
                            <button
                                className="btn btn-sm"
                                style={{ background: '#059669', color: '#fff', fontWeight: 600 }}
                                onClick={() => openStockIn()}
                            >
                                <ArrowDownLeft size={14} /> Stock In
                            </button>
                            <button
                                className="btn btn-sm"
                                style={{ background: '#d97706', color: '#fff', fontWeight: 600 }}
                                onClick={() => openStockOut()}
                            >
                                <ArrowUpRight size={14} /> Stock Out
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={openCreate}>
                                <Plus size={14} /> Add Material
                            </button>
                        </>
                    )}
                </div>
            </PageHeader>

            {/* Active Module Content */}

                    {/* MODULE 1: MATERIAL OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div>
                            {/* KPI Cards */}
                            <div className="stats-grid mb-20" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                                <StatCard
                                    label="Material Inventory"
                                    value={totalCount}
                                    icon={Package}
                                    iconBg="#dbeafe"
                                    iconColor="#2563eb"
                                    subValue={`${CATEGORIES.length} Active categories`}
                                />
                                <StatCard
                                    label="Low Stock Alerts"
                                    value={lowStockMaterials.length}
                                    icon={AlertTriangle}
                                    iconBg={lowStockMaterials.length > 0 ? '#fee2e2' : '#dcfce7'}
                                    iconColor={lowStockMaterials.length > 0 ? '#dc2626' : '#16a34a'}
                                    subValue={lowStockMaterials.length > 0 ? `${lowStockMaterials.length} item(s) below threshold` : 'All materials adequate'}
                                />
                                <StatCard
                                    label="Total Inventory Value"
                                    value={formatCurrency(totalInventoryValue)}
                                    icon={DollarSign}
                                    iconBg="#fef3c7"
                                    iconColor="#d97706"
                                    subValue="Warehouse valuation"
                                />
                                <StatCard
                                    label="Project Material Spent"
                                    value={formatCurrency(allTxns.filter(t => t.transactionType === 'Consumption').reduce((s, t) => s + Number(t.totalCost || 0), 0))}
                                    icon={Building2}
                                    iconBg="#ede9fe"
                                    iconColor="#7c3aed"
                                    subValue={`${projectAllocations.length} Active project allocations`}
                                />
                            </div>

                            {/* Urgent Alert Banner */}
                            {lowStockMaterials.length > 0 && (
                                <div style={{
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    borderRadius: 10,
                                    padding: '12px 18px',
                                    marginBottom: 20,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 12
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <AlertTriangle color="#d97706" size={20} />
                                        <div>
                                            <strong style={{ color: '#92400e', fontSize: 14 }}>Urgent Low Stock Alert</strong>
                                            <div style={{ color: '#b45309', fontSize: 12 }}>
                                                {lowStockMaterials.map(m => `${m.name} (${m.currentStock} ${m.unit} left, min ${m.minimumStockThreshold})`).join(' · ')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('alerts')}>
                                            View Alert Center
                                        </button>
                                        {canManage && (
                                            <button
                                                className="btn btn-warning btn-sm"
                                                style={{ fontWeight: 600 }}
                                                onClick={() => handleOneClickRestock(lowStockMaterials[0])}
                                            >
                                                ⚡ 1-Click Restock {lowStockMaterials[0]?.name}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quick Module Operations Strip */}
                            <div className="card mb-20" style={{ padding: 18 }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Quick Material Operations</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('stock-in')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                                            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                                            color: '#166534', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        <ArrowDownLeft size={18} color="#16a34a" />
                                        <div>
                                            <div>Receive Stock In</div>
                                            <div style={{ fontSize: 11, fontWeight: 400, color: '#4ade80' }}>Log warehouse deliveries</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('stock-out')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                                            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
                                            color: '#92400e', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        <ArrowUpRight size={18} color="#d97706" />
                                        <div>
                                            <div>Dispatch Stock Out</div>
                                            <div style={{ fontSize: 11, fontWeight: 400, color: '#f59e0b' }}>Issue material to site</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('requests')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                                            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                                            color: '#1e40af', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        <ClipboardList size={18} color="#2563eb" />
                                        <div>
                                            <div>Material Requisitions</div>
                                            <div style={{ fontSize: 11, fontWeight: 400, color: '#60a5fa' }}>{requests.filter(r => r.status === 'Pending').length} Pending requests</div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('orders')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                                            background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8,
                                            color: '#6b21a8', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        <ShoppingCart size={18} color="#9333ea" />
                                        <div>
                                            <div>Purchase Orders</div>
                                            <div style={{ fontSize: 11, fontWeight: 400, color: '#c084fc' }}>{purchaseOrders.length} Procurement orders</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Category Distribution Grid */}
                            <div className="card mb-20" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Inventory Valuation by Category</h4>
                                    <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('inventory')}>
                                        Browse Full Inventory →
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                                    {Object.entries(categoryStats).map(([cat, stat]) => (
                                        <div
                                            key={cat}
                                            style={{
                                                padding: '12px 14px',
                                                background: 'var(--bg-page)',
                                                borderRadius: 8,
                                                border: stat.lowStock > 0 ? '1px solid #fecaca' : '1px solid var(--border)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <strong style={{ fontSize: 13 }}>{cat}</strong>
                                                {stat.lowStock > 0 && (
                                                    <span style={{ fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                                                        {stat.lowStock} Low
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                                                {formatCurrency(stat.totalVal)}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {stat.count} item{stat.count === 1 ? '' : 's'} registered
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity Feed */}
                            <div className="card" style={{ padding: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Stock Transactions</h4>
                                    <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('transactions')}>
                                        View Full History →
                                    </button>
                                </div>
                                <DataTable className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Material</th>
                                                <th>Quantity</th>
                                                <th>Value</th>
                                                <th>Project Allocation</th>
                                                <th>Recorded By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allTxns.slice(0, 5).map(t => (
                                                <tr key={t.id}>
                                                    <td>{formatDate(t.transactionDate)}</td>
                                                    <td><StatusBadge status={t.transactionType} /></td>
                                                    <td><strong>{t.materialName}</strong></td>
                                                    <td>{t.quantity}</td>
                                                    <td><strong>{formatCurrency(t.totalCost)}</strong></td>
                                                    <td>{t.projectName || '—'}</td>
                                                    <td><small style={{ color: 'var(--text-muted)' }}>{t.recordedBy}</small></td>
                                                </tr>
                                            ))}
                                            {allTxns.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No transactions recorded yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </DataTable>
                            </div>
                        </div>
                    )}

                    {/* MODULE 2: MATERIAL INVENTORY */}
                    {activeTab === 'inventory' && (
                        <div>
                            <div className="filter-bar">
                                <div className="search-input">
                                    <Search size={16} color="var(--text-muted)" />
                                    <input
                                        placeholder="Search materials, codes, suppliers…"
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    />
                                </div>
                                <select className="filter-select" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
                                    <option value="">All Categories</option>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                                <select className="filter-select" value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}>
                                    <option value="">All Stock Status</option>
                                    <option value="low">Low Stock Only</option>
                                </select>
                            </div>

                            {loading ? <SkeletonLoader /> : (
                                <div className="card">
                                    <DataTable className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Material</th>
                                                    <th>Category</th>
                                                    <th>Stock</th>
                                                    <th>Min. Threshold</th>
                                                    <th>Unit Cost</th>
                                                    <th>Total Value</th>
                                                    <th>Storage Location</th>
                                                    <th>Supplier</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materials.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={10}>
                                                            <EmptyState
                                                                icon={<Package size={40} />}
                                                                title="No materials found"
                                                                description="Register materials to track site warehouse inventory."
                                                                action={canManage && <button className="btn btn-primary" onClick={openCreate}>Add Material</button>}
                                                            />
                                                        </td>
                                                    </tr>
                                                ) : materials.map(m => {
                                                    const isLow = m.currentStock <= m.minimumStockThreshold;
                                                    return (
                                                        <tr key={m.id}>
                                                            <td>
                                                                <div style={{ fontWeight: 600 }}>{m.name}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.unit}</div>
                                                            </td>
                                                            <td>{m.category}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {isLow && <AlertTriangle size={14} color="var(--warning)" />}
                                                                    <span style={{ fontWeight: 700, color: isLow ? 'var(--danger)' : 'inherit' }}>
                                                                        {m.currentStock}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td>{m.minimumStockThreshold}</td>
                                                            <td>{formatCurrency(m.unitCost)}</td>
                                                            <td>{formatCurrency(m.currentStock * m.unitCost)}</td>
                                                            <td><small style={{ color: 'var(--text-muted)' }}>{m.storageLocation || 'Warehouse'}</small></td>
                                                            <td>{m.supplier || '—'}</td>
                                                            <td><StatusBadge status={isLow ? 'Low' : 'Adequate'} /></td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                                    {canManage && isLow && (
                                                                        <button
                                                                            className="btn btn-warning btn-sm"
                                                                            style={{ fontWeight: 600, fontSize: 11, padding: '3px 7px' }}
                                                                            onClick={() => handleOneClickRestock(m)}
                                                                        >
                                                                            ⚡ Restock
                                                                        </button>
                                                                    )}
                                                                    {canManage && (
                                                                        <>
                                                                            <button
                                                                                className="btn btn-sm"
                                                                                style={{ background: '#059669', color: '#fff', fontSize: 11, padding: '3px 7px' }}
                                                                                onClick={() => openStockIn(m)}
                                                                                title="Stock In delivery"
                                                                            >
                                                                                + In
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-sm"
                                                                                style={{ background: '#d97706', color: '#fff', fontSize: 11, padding: '3px 7px' }}
                                                                                onClick={() => openStockOut(m)}
                                                                                title="Stock Out to project"
                                                                            >
                                                                                - Out
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openHistory(m)}>
                                                                        History
                                                                    </button>
                                                                    {canManage && (
                                                                        <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openEdit(m)}>
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </DataTable>
                                </div>
                            )}
                            <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />
                        </div>
                    )}

                    {/* MODULE 3: STOCK IN */}
                    {activeTab === 'stock-in' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Stock In — Warehouse Inward Deliveries</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Receive delivered shipments from suppliers and increase warehouse inventory
                                    </p>
                                </div>
                                <button className="btn btn-sm" style={{ background: '#059669', color: '#fff', fontWeight: 600 }} onClick={() => openStockIn()}>
                                    <ArrowDownLeft size={14} /> Open Stock In Modal
                                </button>
                            </div>

                            {/* Direct Stock In Form Card */}
                            {canManage && (
                                <div className="card mb-20" style={{ padding: 20, borderTop: '4px solid #059669' }}>
                                    <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Fast Stock In Entry</h4>
                                    <form onSubmit={handleInlineStockInSubmit}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Select Material *</label>
                                                <select
                                                    className="form-control"
                                                    value={inlineStockIn.materialId}
                                                    onChange={e => {
                                                        const mId = e.target.value;
                                                        const mat = materials.find(m => m.id === Number(mId));
                                                        setInlineStockIn(f => ({
                                                            ...f,
                                                            materialId: mId,
                                                            supplier: mat?.supplier || f.supplier,
                                                            unitCost: mat?.unitCost || f.unitCost
                                                        }));
                                                    }}
                                                    required
                                                >
                                                    <option value="">Select Material to Restock…</option>
                                                    {materials.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name} (Current: {m.currentStock} {m.unit} | Min: {m.minimumStockThreshold})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Supplier / Kiln / Quarry</label>
                                                <input
                                                    className="form-control"
                                                    placeholder="e.g. ACC Cement Ltd"
                                                    value={inlineStockIn.supplier}
                                                    onChange={e => setInlineStockIn(f => ({ ...f, supplier: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Quantity Received *</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0.01"
                                                    className="form-control"
                                                    placeholder="Enter quantity"
                                                    value={inlineStockIn.quantity}
                                                    onChange={e => setInlineStockIn(f => ({ ...f, quantity: e.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Unit Cost (INR)</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    className="form-control"
                                                    placeholder="Cost per unit"
                                                    value={inlineStockIn.unitCost}
                                                    onChange={e => setInlineStockIn(f => ({ ...f, unitCost: e.target.value }))}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Delivery Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={inlineStockIn.transactionDate}
                                                    onChange={e => setInlineStockIn(f => ({ ...f, transactionDate: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Delivery Notes / Invoice No.</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. Invoice #INV-8891, 10-wheeler truck dispatch"
                                                value={inlineStockIn.notes}
                                                onChange={e => setInlineStockIn(f => ({ ...f, notes: e.target.value }))}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {inlineStockIn.quantity && inlineStockIn.unitCost ? (
                                                    <span>Total Delivery Value: <strong style={{ color: '#059669', fontSize: 15 }}>{formatCurrency(Number(inlineStockIn.quantity) * Number(inlineStockIn.unitCost))}</strong></span>
                                                ) : null}
                                            </div>
                                            <button
                                                type="submit"
                                                className="btn"
                                                style={{ background: '#059669', color: '#fff', fontWeight: 600, padding: '8px 20px' }}
                                                disabled={inlineSaving || !inlineStockIn.materialId || !inlineStockIn.quantity}
                                            >
                                                {inlineSaving ? 'Saving…' : '✓ Confirm Stock In Delivery'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Recent Stock In Deliveries */}
                            <div className="card">
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Stock In Deliveries (Purchases)</h4>
                                </div>
                                <DataTable className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Material</th>
                                                <th>Quantity Received</th>
                                                <th>Unit Cost</th>
                                                <th>Total Value</th>
                                                <th>Recorded By</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allTxns.filter(t => t.transactionType === 'Purchase').map(t => (
                                                <tr key={t.id}>
                                                    <td>{formatDate(t.transactionDate)}</td>
                                                    <td><strong>{t.materialName}</strong></td>
                                                    <td><span style={{ color: '#059669', fontWeight: 700 }}>+{t.quantity}</span></td>
                                                    <td>{formatCurrency(t.unitCost)}</td>
                                                    <td><strong>{formatCurrency(t.totalCost)}</strong></td>
                                                    <td><small style={{ color: 'var(--text-muted)' }}>{t.recordedBy}</small></td>
                                                    <td><small>{t.notes || '—'}</small></td>
                                                </tr>
                                            ))}
                                            {allTxns.filter(t => t.transactionType === 'Purchase').length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stock in deliveries recorded yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </DataTable>
                            </div>
                        </div>
                    )}

                    {/* MODULE 4: STOCK OUT */}
                    {activeTab === 'stock-out' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Stock Out — Site Material Issuance & Consumption</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Dispatch materials from warehouse to construction project sites
                                    </p>
                                </div>
                                <button className="btn btn-sm" style={{ background: '#d97706', color: '#fff', fontWeight: 600 }} onClick={() => openStockOut()}>
                                    <ArrowUpRight size={14} /> Open Stock Out Modal
                                </button>
                            </div>

                            {/* Direct Stock Out Form Card */}
                            {canManage && (
                                <div className="card mb-20" style={{ padding: 20, borderTop: '4px solid #d97706' }}>
                                    <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Fast Stock Out Dispatch</h4>
                                    <form onSubmit={handleInlineStockOutSubmit}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Material to Dispatch *</label>
                                                <select
                                                    className="form-control"
                                                    value={inlineStockOut.materialId}
                                                    onChange={e => setInlineStockOut(f => ({ ...f, materialId: e.target.value }))}
                                                    required
                                                >
                                                    <option value="">Select Material…</option>
                                                    {materials.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name} (Available: {m.currentStock} {m.unit})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Destination Construction Project *</label>
                                                <select
                                                    className="form-control"
                                                    value={inlineStockOut.projectId}
                                                    onChange={e => setInlineStockOut(f => ({ ...f, projectId: e.target.value }))}
                                                    required
                                                >
                                                    <option value="">Select Destination Project…</option>
                                                    {projects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Quantity to Issue *</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0.01"
                                                    className="form-control"
                                                    placeholder="Enter dispatch quantity"
                                                    value={inlineStockOut.quantity}
                                                    onChange={e => setInlineStockOut(f => ({ ...f, quantity: e.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Dispatch Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={inlineStockOut.transactionDate}
                                                    onChange={e => setInlineStockOut(f => ({ ...f, transactionDate: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Dispatch Notes & Memo</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. Issued for 3rd floor slab casting requisition"
                                                value={inlineStockOut.notes}
                                                onChange={e => setInlineStockOut(f => ({ ...f, notes: e.target.value }))}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {inlineStockOut.materialId && (
                                                    (() => {
                                                        const mat = materials.find(m => m.id === Number(inlineStockOut.materialId));
                                                        if (!mat) return null;
                                                        const rem = mat.currentStock - (Number(inlineStockOut.quantity) || 0);
                                                        return (
                                                            <span>Remaining Warehouse Stock: <strong style={{ color: rem < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{rem} {mat.unit}</strong></span>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                            <button
                                                type="submit"
                                                className="btn"
                                                style={{ background: '#d97706', color: '#fff', fontWeight: 600, padding: '8px 20px' }}
                                                disabled={inlineSaving || !inlineStockOut.materialId || !inlineStockOut.quantity}
                                            >
                                                {inlineSaving ? 'Saving…' : '✓ Confirm Stock Out / Dispatch'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Recent Stock Out Dispatches */}
                            <div className="card">
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Site Dispatches (Consumptions)</h4>
                                </div>
                                <DataTable className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Material</th>
                                                <th>Quantity Issued</th>
                                                <th>Project Site</th>
                                                <th>Total Value</th>
                                                <th>Recorded By</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allTxns.filter(t => t.transactionType === 'Consumption').map(t => (
                                                <tr key={t.id}>
                                                    <td>{formatDate(t.transactionDate)}</td>
                                                    <td><strong>{t.materialName}</strong></td>
                                                    <td><span style={{ color: '#d97706', fontWeight: 700 }}>-{t.quantity}</span></td>
                                                    <td><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t.projectName || 'Warehouse'}</span></td>
                                                    <td><strong>{formatCurrency(t.totalCost)}</strong></td>
                                                    <td><small style={{ color: 'var(--text-muted)' }}>{t.recordedBy}</small></td>
                                                    <td><small>{t.notes || '—'}</small></td>
                                                </tr>
                                            ))}
                                            {allTxns.filter(t => t.transactionType === 'Consumption').length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stock out dispatches recorded yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </DataTable>
                            </div>
                        </div>
                    )}

                    {/* MODULE 5: MATERIAL REQUESTS */}
                    {activeTab === 'requests' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Site Material Requests</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Requisitions from Site Engineers for upcoming construction stages
                                    </p>
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={() => setReqModal(true)}>
                                    <Plus size={14} /> New Material Request
                                </button>
                            </div>

                            <div className="card">
                                <DataTable className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Request ID</th>
                                                <th>Material</th>
                                                <th>Quantity</th>
                                                <th>Project</th>
                                                <th>Requested By</th>
                                                <th>Urgency</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests.map(req => (
                                                <tr key={req.id}>
                                                    <td><strong>{req.id}</strong></td>
                                                    <td><strong>{req.materialName}</strong></td>
                                                    <td>{req.quantity} {req.unit}</td>
                                                    <td>{req.projectName}</td>
                                                    <td>{req.requestedBy}</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 10,
                                                            background: req.urgency === 'Urgent' ? '#fee2e2' : req.urgency === 'High' ? '#fef3c7' : '#dcfce7',
                                                            color: req.urgency === 'Urgent' ? '#dc2626' : req.urgency === 'High' ? '#d97706' : '#16a34a'
                                                        }}>
                                                            {req.urgency}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(req.date)}</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 10,
                                                            background: req.status === 'Fulfilled' ? '#dcfce7' : req.status === 'Approved' ? '#dbeafe' : '#fef3c7',
                                                            color: req.status === 'Fulfilled' ? '#16a34a' : req.status === 'Approved' ? '#2563eb' : '#d97706'
                                                        }}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {canManage && req.status !== 'Fulfilled' ? (
                                                            <button
                                                                className="btn btn-sm"
                                                                style={{ background: '#059669', color: '#fff', fontSize: 11, padding: '3px 8px' }}
                                                                onClick={() => handleFulfillRequest(req)}
                                                            >
                                                                Approve & Issue (Stock Out)
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--success)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                <Check size={14} /> Completed
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </DataTable>
                            </div>
                        </div>
                    )}

                    {/* MODULE 6: SUPPLIERS */}
                    {activeTab === 'suppliers' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Suppliers Directory</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Approved manufacturers, quarries, kilns, and building supply vendors
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                {SUPPLIERS_CATALOG.map(s => (
                                    <div key={s.name} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{s.category}</span>
                                                    <h4 style={{ margin: '2px 0 0', fontSize: 16 }}>{s.name}</h4>
                                                </div>
                                                <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                                                    ⭐ {s.rating}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                                <strong>Supplies:</strong> {s.material}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-page)', padding: 10, borderRadius: 6 }}>
                                                <div>Contact: <strong>{s.contact}</strong></div>
                                                <div>Phone: <strong>{s.phone}</strong></div>
                                                <div>Email: <strong>{s.email}</strong></div>
                                                <div>Avg. Lead Time: <strong>{s.leadTime}</strong></div>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                                                onClick={() => {
                                                    const mat = materials.find(m => m.supplier?.toLowerCase() === s.name.toLowerCase());
                                                    openStockIn(mat);
                                                }}
                                            >
                                                + Order / Stock In from {s.name}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODULE 7: PURCHASE ORDERS */}
                    {activeTab === 'orders' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Purchase Orders (POs)</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Procurement orders sent to material suppliers and delivery status
                                    </p>
                                </div>
                                {canManage && (
                                    <button className="btn btn-primary btn-sm" onClick={() => setPoModal(true)}>
                                        <Plus size={14} /> Create Purchase Order
                                    </button>
                                )}
                            </div>

                            <div className="card">
                                <DataTable className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>PO Number</th>
                                                <th>Supplier</th>
                                                <th>Item & Quantity</th>
                                                <th>Total Value</th>
                                                <th>Order Date</th>
                                                <th>Expected Delivery</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {purchaseOrders.map(po => (
                                                <tr key={po.poNumber}>
                                                    <td><strong>{po.poNumber}</strong></td>
                                                    <td>{po.supplier}</td>
                                                    <td>{po.materialName} ({po.quantity} {po.unit})</td>
                                                    <td><strong>{formatCurrency(po.totalAmount)}</strong></td>
                                                    <td>{formatDate(po.orderDate)}</td>
                                                    <td>{formatDate(po.expectedDate)}</td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 10,
                                                            background: po.status === 'Delivered' ? '#dcfce7' : '#dbeafe',
                                                            color: po.status === 'Delivered' ? '#16a34a' : '#2563eb'
                                                        }}>
                                                            {po.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {canManage && po.status !== 'Delivered' ? (
                                                            <button
                                                                className="btn btn-sm"
                                                                style={{ background: '#059669', color: '#fff', fontSize: 11, padding: '3px 8px' }}
                                                                onClick={() => handleReceivePO(po)}
                                                            >
                                                                Receive (Stock In)
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--success)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                <Check size={14} /> Delivered
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </DataTable>
                            </div>
                        </div>
                    )}

                    {/* MODULE 8: PROJECT MATERIAL ALLOCATION */}
                    {activeTab === 'allocations' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Project Material Allocations</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Breakdown of materials dispatched and consumed by each construction site
                                    </p>
                                </div>
                                {canManage && (
                                    <button className="btn btn-primary btn-sm" onClick={() => openStockOut()}>
                                        <ArrowUpRight size={14} /> Allocate Material to Project
                                    </button>
                                )}
                            </div>

                            {projectAllocations.length === 0 ? (
                                <div className="card">
                                    <EmptyState
                                        icon={<Building2 size={40} />}
                                        title="No Project Allocations Yet"
                                        description="Issue materials to projects via 'Stock Out' to track consumption."
                                        action={canManage && <button className="btn btn-primary" onClick={() => openStockOut()}>Issue Stock to Project</button>}
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                                    {projectAllocations.map(alloc => (
                                        <div key={alloc.projectId} className="card" style={{ padding: 18 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                                                <div>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Project #{alloc.projectId}</span>
                                                    <h4 style={{ margin: '2px 0 0', fontSize: 16 }}>{alloc.projectName}</h4>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Cost</span>
                                                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>{formatCurrency(alloc.totalSpent)}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Materials Issued to Site:</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {Object.entries(alloc.items).map(([name, qty]) => (
                                                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: 'var(--bg-page)', padding: '6px 10px', borderRadius: 6 }}>
                                                        <span>{name}</span>
                                                        <strong>{qty}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                            {canManage && (
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                                                    onClick={() => openStockOut(null, alloc.projectId)}
                                                >
                                                    + Dispatch More to this Project
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODULE 9: LOW STOCK ALERTS */}
                    {activeTab === 'alerts' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Low Stock Alerts & Reorder Center</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Materials that have fallen below safety thresholds and require immediate purchase replenishment
                                    </p>
                                </div>
                            </div>

                            {lowStockMaterials.length === 0 ? (
                                <div className="card">
                                    <EmptyState
                                        icon={<CheckCircle2 size={44} color="#16a34a" />}
                                        title="All Stocks Healthy"
                                        description="All materials are currently above their minimum safety thresholds. No replenishment required."
                                    />
                                </div>
                            ) : (
                                <div>
                                    {/* Deficit Summary Card */}
                                    <div style={{
                                        background: '#fffbeb',
                                        border: '1px solid #fde68a',
                                        borderRadius: 10,
                                        padding: '16px 20px',
                                        marginBottom: 16,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 12
                                    }}>
                                        <div>
                                            <strong style={{ color: '#92400e', fontSize: 15 }}>{lowStockMaterials.length} Materials Below Safety Threshold</strong>
                                            <div style={{ color: '#b45309', fontSize: 13, marginTop: 2 }}>
                                                Estimated deficit restock cost: <strong>{formatCurrency(lowStockMaterials.reduce((sum, m) => sum + ((m.minimumStockThreshold - m.currentStock) * m.unitCost), 0))}</strong>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <button
                                                className="btn btn-warning btn-sm"
                                                style={{ fontWeight: 700, padding: '8px 16px' }}
                                                onClick={() => {
                                                    lowStockMaterials.forEach(m => handleOneClickRestock(m));
                                                }}
                                            >
                                                ⚡ Restock All {lowStockMaterials.length} Deficits
                                            </button>
                                        )}
                                    </div>

                                    {/* Low Stock Items Detailed Table */}
                                    <div className="card">
                                        <DataTable className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Material</th>
                                                        <th>Category</th>
                                                        <th>Current Stock</th>
                                                        <th>Min. Threshold</th>
                                                        <th>Deficit Units</th>
                                                        <th>Est. Restock Cost</th>
                                                        <th>Preferred Supplier</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lowStockMaterials.map(m => {
                                                        const deficit = Math.max(1, m.minimumStockThreshold - m.currentStock);
                                                        const deficitCost = deficit * m.unitCost;
                                                        return (
                                                            <tr key={m.id}>
                                                                <td>
                                                                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.unit}</div>
                                                                </td>
                                                                <td>{m.category}</td>
                                                                <td>
                                                                    <span style={{ color: 'var(--danger)', fontWeight: 800, fontSize: 14 }}>
                                                                        {m.currentStock} {m.unit}
                                                                    </span>
                                                                </td>
                                                                <td>{m.minimumStockThreshold} {m.unit}</td>
                                                                <td>
                                                                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontSize: 12 }}>
                                                                        -{deficit} {m.unit}
                                                                    </span>
                                                                </td>
                                                                <td><strong>{formatCurrency(deficitCost)}</strong></td>
                                                                <td>{m.supplier || '—'}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                                        {canManage && (
                                                                            <button
                                                                                className="btn btn-warning btn-sm"
                                                                                style={{ fontWeight: 600, fontSize: 11, padding: '4px 10px' }}
                                                                                onClick={() => handleOneClickRestock(m)}
                                                                            >
                                                                                ⚡ 1-Click Restock
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="btn btn-outline btn-sm"
                                                                            style={{ fontSize: 11, padding: '4px 8px' }}
                                                                            onClick={() => openStockIn(m)}
                                                                        >
                                                                            + Stock In
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </DataTable>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODULE 10: TRANSACTION HISTORY */}
                    {activeTab === 'transactions' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Transaction History & Stock Movement</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Complete audit log of all Stock In, Stock Out, Purchases, and Project Issues
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select
                                        className="form-control"
                                        style={{ width: 160, fontSize: 13 }}
                                        value={txnTypeFilter}
                                        onChange={e => setTxnTypeFilter(e.target.value)}
                                    >
                                        <option value="">All Types</option>
                                        <option value="Purchase">Purchase (Stock In)</option>
                                        <option value="Consumption">Consumption (Stock Out)</option>
                                        <option value="Return">Return</option>
                                        <option value="Adjustment">Adjustment</option>
                                    </select>
                                    <button className="btn btn-outline btn-sm" onClick={loadAllTransactions}>
                                        <RefreshCw size={14} /> Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="card">
                                {loadingTxns ? <SkeletonLoader /> : (
                                    <DataTable className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Type</th>
                                                    <th>Material</th>
                                                    <th>Quantity</th>
                                                    <th>Unit Cost</th>
                                                    <th>Total Value</th>
                                                    <th>Project Allocation</th>
                                                    <th>Recorded By</th>
                                                    <th>Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allTxns
                                                    .filter(t => !txnTypeFilter || t.transactionType === txnTypeFilter)
                                                    .map(t => (
                                                        <tr key={t.id}>
                                                            <td>{formatDate(t.transactionDate)}</td>
                                                            <td><StatusBadge status={t.transactionType} /></td>
                                                            <td><strong>{t.materialName}</strong></td>
                                                            <td>{t.quantity}</td>
                                                            <td>{formatCurrency(t.unitCost)}</td>
                                                            <td><strong>{formatCurrency(t.totalCost)}</strong></td>
                                                            <td>{t.projectName ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t.projectName}</span> : '—'}</td>
                                                            <td><small style={{ color: 'var(--text-muted)' }}>{t.recordedBy}</small></td>
                                                            <td><small>{t.notes || '—'}</small></td>
                                                        </tr>
                                                    ))}
                                                {allTxns.length === 0 && (
                                                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </DataTable>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODULE 11: MATERIAL REPORTS */}
                    {activeTab === 'reports' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Material Valuation & Analytics Reports</h3>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Capital investment and material allocation by trade category
                                    </p>
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={exportToCsv}>
                                    <Download size={14} /> Download Full Report
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
                                <div className="card" style={{ padding: 20 }}>
                                    <h4 style={{ margin: '0 0 14px', fontSize: 15 }}>Stock Health Status</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <span>Adequately Stocked ({totalCount - lowStockMaterials.length} items)</span>
                                                <strong>{totalCount > 0 ? Math.round(((totalCount - lowStockMaterials.length) / totalCount) * 100) : 100}%</strong>
                                            </div>
                                            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${totalCount > 0 ? ((totalCount - lowStockMaterials.length) / totalCount) * 100 : 100}%`, background: '#22c55e' }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <span>Critical / Low Stock ({lowStockMaterials.length} items)</span>
                                                <strong style={{ color: 'var(--danger)' }}>{totalCount > 0 ? Math.round((lowStockMaterials.length / totalCount) * 100) : 0}%</strong>
                                            </div>
                                            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${totalCount > 0 ? (lowStockMaterials.length / totalCount) * 100 : 0}%`, background: '#ef4444' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card" style={{ padding: 20 }}>
                                    <h4 style={{ margin: '0 0 14px', fontSize: 15 }}>Inventory Financial Summary</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Warehouse Valuation:</span>
                                            <strong>{formatCurrency(totalInventoryValue)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Allocated to Projects:</span>
                                            <strong>{formatCurrency(allTxns.filter(t => t.transactionType === 'Consumption').reduce((s, t) => s + Number(t.totalCost || 0), 0))}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Estimated Restock Cost:</span>
                                            <strong style={{ color: 'var(--warning)' }}>
                                                {formatCurrency(lowStockMaterials.reduce((sum, m) => sum + ((m.minimumStockThreshold - m.currentStock) * m.unitCost), 0))}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

            {/* MODAL: ADD / EDIT MATERIAL */}
            <Modal
                isOpen={matModal}
                onClose={() => setMatModal(false)}
                title={editMat ? 'Edit Material Specification' : 'Register New Material'}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setMatModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveMaterial} disabled={saving}>{saving ? 'Saving…' : 'Save Material'}</button>
                    </>
                }
            >
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Material Name *</label>
                        <input className="form-control" placeholder="e.g. UltraTech Cement OPC 53" value={matForm.name || ''} onChange={e => setMatForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Category *</label>
                        <select className="form-control" value={matForm.category || ''} onChange={e => setMatForm(f => ({ ...f, category: e.target.value }))}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Measurement Unit</label>
                        <input className="form-control" value={matForm.unit || ''} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))} placeholder="Bags, MT, Nos, Litres, Sq.Ft…" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Min. Safety Threshold</label>
                        <input type="number" className="form-control" value={matForm.minimumStockThreshold || 0} onChange={e => setMatForm(f => ({ ...f, minimumStockThreshold: e.target.value }))} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Unit Cost (INR) *</label>
                        <input type="number" step="any" className="form-control" value={matForm.unitCost || 0} onChange={e => setMatForm(f => ({ ...f, unitCost: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Preferred Supplier</label>
                        <input className="form-control" value={matForm.supplier || ''} onChange={e => setMatForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Storage Location / Bay</label>
                    <input className="form-control" value={matForm.storageLocation || ''} onChange={e => setMatForm(f => ({ ...f, storageLocation: e.target.value }))} placeholder="Warehouse Bay 1, Yard 2…" />
                </div>
            </Modal>

            {/* MODAL: RECORD STOCK TRANSACTION (STOCK IN / STOCK OUT) */}
            <Modal
                isOpen={txnModal}
                onClose={() => setTxnModal(false)}
                title={txnForm.transactionType === 'Purchase' ? 'Receive Stock In (Purchase Delivery)' : txnForm.transactionType === 'Consumption' ? 'Stock Out (Issue to Project)' : 'Record Stock Transaction'}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setTxnModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveTxn} disabled={saving}>{saving ? 'Saving…' : 'Record Transaction'}</button>
                    </>
                }
            >
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Transaction Type *</label>
                        <select className="form-control" value={txnForm.transactionType} onChange={e => setTxnForm(f => ({ ...f, transactionType: e.target.value }))}>
                            {TXN_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Material *</label>
                        <select
                            className="form-control"
                            value={txnForm.materialId}
                            onChange={e => {
                                const m = materials.find(x => x.id === parseInt(e.target.value));
                                setTxnForm(f => ({
                                    ...f,
                                    materialId: e.target.value,
                                    unitCost: m ? m.unitCost : f.unitCost
                                }));
                            }}
                            required
                        >
                            <option value="">Select Material…</option>
                            {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.currentStock} {m.unit} in stock)</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Quantity *</label>
                        <input
                            type="number"
                            step="any"
                            min="0.01"
                            className="form-control"
                            placeholder="Enter quantity"
                            value={txnForm.quantity}
                            onChange={e => setTxnForm(f => ({ ...f, quantity: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Unit Cost (INR)</label>
                        <input
                            type="number"
                            step="any"
                            className="form-control"
                            value={txnForm.unitCost}
                            onChange={e => setTxnForm(f => ({ ...f, unitCost: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Project Allocation</label>
                    <select
                        className="form-control"
                        value={txnForm.projectId}
                        onChange={e => setTxnForm(f => ({ ...f, projectId: e.target.value }))}
                    >
                        <option value="">None / General Warehouse</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Notes & Remarks</label>
                    <textarea
                        className="form-control"
                        rows={2}
                        value={txnForm.notes}
                        onChange={e => setTxnForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Invoice number, site engineer memo, or dispatch remarks"
                    />
                </div>
            </Modal>

            {/* MODAL: NEW MATERIAL REQUEST */}
            <Modal
                isOpen={reqModal}
                onClose={() => setReqModal(false)}
                title="Create Site Material Requisition"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setReqModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreateRequest}>Submit Request</button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Material *</label>
                    <select
                        className="form-control"
                        value={reqForm.materialId}
                        onChange={e => setReqForm({ ...reqForm, materialId: e.target.value })}
                        required
                    >
                        <option value="">Select Material…</option>
                        {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} (Current Stock: {m.currentStock} {m.unit})</option>
                        ))}
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Required Quantity *</label>
                        <input
                            type="number"
                            min={1}
                            className="form-control"
                            placeholder="e.g. 50"
                            value={reqForm.quantity}
                            onChange={e => setReqForm({ ...reqForm, quantity: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Priority / Urgency</label>
                        <select className="form-control" value={reqForm.urgency} onChange={e => setReqForm({ ...reqForm, urgency: e.target.value })}>
                            <option value="Urgent">Urgent (Immediate)</option>
                            <option value="High">High (Within 24h)</option>
                            <option value="Normal">Normal</option>
                        </select>
                    </div>
                </div>
            </Modal>

            {/* MODAL: NEW PURCHASE ORDER */}
            <Modal
                isOpen={poModal}
                onClose={() => setPoModal(false)}
                title="Create Purchase Order (PO)"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setPoModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreatePO}>Issue Purchase Order</button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Select Material *</label>
                    <select
                        className="form-control"
                        value={poForm.materialId}
                        onChange={e => {
                            const mat = materials.find(m => m.id === Number(e.target.value));
                            setPoForm({ ...poForm, materialId: e.target.value, supplier: mat?.supplier || poForm.supplier });
                        }}
                        required
                    >
                        <option value="">Select Material…</option>
                        {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} — Current: {m.currentStock} {m.unit}</option>
                        ))}
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Supplier *</label>
                        <input
                            className="form-control"
                            value={poForm.supplier}
                            onChange={e => setPoForm({ ...poForm, supplier: e.target.value })}
                            placeholder="e.g. ACC Cement Ltd"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Order Quantity *</label>
                        <input
                            type="number"
                            min={1}
                            className="form-control"
                            placeholder="e.g. 100"
                            value={poForm.quantity}
                            onChange={e => setPoForm({ ...poForm, quantity: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Expected Delivery Date</label>
                    <input
                        type="date"
                        className="form-control"
                        value={poForm.expectedDate}
                        onChange={e => setPoForm({ ...poForm, expectedDate: e.target.value })}
                    />
                </div>
            </Modal>

            {/* MODAL: SINGLE ITEM TRANSACTION HISTORY */}
            <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title={`Transaction History: ${selectedMat?.name}`} maxWidth={720}>
                <DataTable className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Unit Cost</th>
                                <th>Total</th>
                                <th>Project</th>
                                <th>By</th>
                            </tr>
                        </thead>
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
                            {txnHistory.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No transactions recorded for this material.</td></tr>
                            )}
                        </tbody>
                    </table>
                </DataTable>
            </Modal>
        </div>
    );
}
