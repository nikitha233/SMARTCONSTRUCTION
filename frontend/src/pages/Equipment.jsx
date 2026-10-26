import { useCallback, useEffect, useRef, useState } from 'react';
import { equipmentApi } from '../services/api';
import { useToast } from '../context/useToast';
import { useAuth } from '../context/useAuth';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StatusBadge, SkeletonLoader, EmptyState, ConfirmDialog, Modal, PageHeader, FormField, Pagination } from '../components/UI';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useRequestController } from '../hooks/useRequestController';
import { useApi } from '../hooks/useApi';
import { Plus, Search, Pencil, Trash2, Truck, Wrench } from 'lucide-react';

const TODAY_DATE = new Date().toISOString().slice(0, 10);

const CATEGORIES = [
    'Lifting Equipment',
    'Earthwork Equipment',
    'Concrete Equipment',
    'Power Equipment',
    'Safety Equipment',
    'Compaction Equipment',
    'Transport'
];

const EQUIPMENT_SUGGESTIONS = {
    'Concrete Equipment': [
        'Transit Mixer (6 m³ / Schwing Stetter)',
        'Concrete Mixer (1 Bag / 10/7 CFT)',
        'Concrete Boom Pump (36m Putzmeister)',
        'Concrete Needle Vibrator (2 HP)',
        'Power Trowel / Concrete Float Machine',
        'Stationary Concrete Pump (Putzmeister SP 1800)',
        'Mobile Batching Plant (30 m³/hr)',
    ],
    'Lifting Equipment': [
        'ACE 15XW Hydra Crane',
        'Tower Crane (50 Ton Liebherr)',
        'Crawler Crane (75 Ton Tata Hitachi)',
        'Material Hoist (1.5 Ton)',
        'Diesel Forklift (3 Ton Godrej)',
    ],
    'Earthwork Equipment': [
        'Hydraulic Excavator (CAT 320D)',
        'Backhoe Loader (JCB 3DX Super)',
        'Bulldozer (CAT D6)',
        'Mini Excavator (Kubota 3 Ton)',
        'Motor Grader (CAT 120K)',
        'Wheel Loader (Liugong)',
    ],
    'Compaction Equipment': [
        'Vibratory Soil Compactor (10 Ton)',
        'Plate Compactor (Diesel 5 HP)',
        'Tandem Asphalt Roller (3 Ton Dynapac)',
        'Tamping Rammer / Jumping Jack',
    ],
    'Power Equipment': [
        'Diesel Generator (125 KVA Kirloskar)',
        'Screw Air Compressor (400 CFM Atlas Copco)',
        'DG Set (250 KVA Cummins)',
        'Mobile Lighting Mast (4x1000W LED)',
    ],
    'Transport': [
        'Heavy Tipper Truck (16 m³ Tata 2518)',
        'Water Tanker Truck (10,000 Litres)',
        'Tractor Trolley',
    ],
    'Safety Equipment': [
        'Scaffolding System (Cuplock Heavy Duty)',
        'Aluminium Mobile Scaffolding Tower',
        'Safety Netting & Perimeter Guardrails',
    ],
};

const AVAILABILITY_OPTS = ['Available', 'Assigned', 'UnderMaintenance', 'Unavailable'];
const CONDITION_OPTS = ['Good', 'Fair', 'Poor'];
const OWNERSHIP_OPTS = ['Owned', 'Rented'];
const EMPTY_PAGE = { items: [], totalCount: 0 };

const emptyForm = {
    name: '',
    equipmentCode: '',
    category: 'Lifting Equipment',
    ownershipType: 'Owned',
    condition: 'Good',
    availability: 'Available',
    rentalCostPerDay: 1500,
    nextMaintenanceDate: '',
};

const emptyMaintForm = {
    maintenanceDate: TODAY_DATE,
    maintenanceType: 'Routine Servicing',
    cost: 5000,
    performedBy: '',
    description: '',
    nextMaintenanceDate: '',
};

export default function Equipment() {
    const [categoryFilter, setCategoryFilter] = useState('');
    const [availabilityFilter, setAvailabilityFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebouncedValue(search);
    const pageSize = 20;
    const createRequestController = useRequestController();
    const maintenanceControllerRef = useRef(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Maintenance drawer/modal
    const [maintModalOpen, setMaintModalOpen] = useState(false);
    const [selectedEquipmentForMaint, setSelectedEquipmentForMaint] = useState(null);
    const [maintForm, setMaintForm] = useState(emptyMaintForm);
    const [maintLogs, setMaintLogs] = useState([]);
    const [maintLoading, setMaintLoading] = useState(false);
    const [maintenanceSaving, setMaintenanceSaving] = useState(false);

    const toast = useToast();
    const { isAdminOrManager, isAdmin, hasRole } = useAuth();
    const canManageEquipment = () => hasRole('Admin', 'ProjectManager', 'SiteEngineer');

    const fetchEquipment = useCallback(async (signal) => {
        const response = await equipmentApi.getAll({ category: categoryFilter, availability: availabilityFilter, search: debouncedSearch, page, pageSize }, { signal });
        return { items: response.data.items, totalCount: response.data.totalCount };
    }, [availabilityFilter, categoryFilter, debouncedSearch, page, pageSize]);
    const { data: equipmentPage, loading, error, refetch } = useApi(fetchEquipment, { initialData: EMPTY_PAGE });
    const equipment = equipmentPage.items;
    const totalCount = equipmentPage.totalCount;

    useEffect(() => {
        if (error) toast.error('Failed to load equipment');
    }, [error, toast]);

    const openCreate = () => {
        setEditItem(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (eq) => {
        setEditItem(eq);
        setForm({
            name: eq.name,
            equipmentCode: eq.equipmentCode,
            category: eq.category,
            ownershipType: eq.ownershipType || 'Owned',
            condition: eq.condition || 'Good',
            availability: eq.availability || 'Available',
            rentalCostPerDay: eq.rentalCostPerDay || 0,
            nextMaintenanceDate: eq.nextMaintenanceDate ? eq.nextMaintenanceDate.slice(0, 10) : '',
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.warning('Equipment Name is required');
            return;
        }
        if (!form.equipmentCode.trim()) {
            toast.warning('Asset Code is required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                equipmentCode: form.equipmentCode.trim(),
                category: form.category,
                ownershipType: form.ownershipType || 'Owned',
                condition: form.condition || 'Good',
                availability: form.availability || 'Available',
                rentalCostPerDay: Number(form.rentalCostPerDay) || 0,
                nextMaintenanceDate: form.nextMaintenanceDate ? new Date(form.nextMaintenanceDate).toISOString() : null,
            };

            if (editItem) {
                await equipmentApi.update(editItem.id, {
                    ...payload,
                    isActive: editItem.isActive ?? true,
                    maintenanceDate: editItem.maintenanceDate
                });
                toast.success('Equipment details updated');
            } else {
                await equipmentApi.create(payload);
                toast.success('Equipment registered to fleet');
            }
            setModalOpen(false);
            refetch();
        } catch (err) {
            const errData = err.response?.data;
            let errMsg = errData?.message;
            if (!errMsg && errData?.errors) {
                errMsg = Object.values(errData.errors).flat().join(', ');
            }
            toast.error(errMsg || 'Failed to save equipment');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await equipmentApi.delete(deleteId);
            toast.success('Equipment removed');
            setDeleteId(null);
            refetch();
        } catch {
            toast.error('Failed to delete equipment');
        }
    };

    const openMaintenanceModal = async (eq) => {
        maintenanceControllerRef.current?.abort();
        const controller = createRequestController();
        maintenanceControllerRef.current = controller;
        setSelectedEquipmentForMaint(eq);
        setMaintForm(emptyMaintForm);
        setMaintModalOpen(true);
        setMaintLoading(true);
        try {
            const res = await equipmentApi.getMaintenance(eq.id, { signal: controller.signal });
            setMaintLogs(res.data);
        } catch {
            if (!controller.signal.aborted) setMaintLogs([]);
        } finally {
            if (!controller.signal.aborted) setMaintLoading(false);
        }
    };

    const handleSaveMaintenance = async (e) => {
        e.preventDefault();
        if (!selectedEquipmentForMaint || maintenanceSaving) return;
        setMaintenanceSaving(true);
        try {
            const payload = {
                maintenanceDate: new Date(maintForm.maintenanceDate).toISOString(),
                maintenanceType: maintForm.maintenanceType || 'Routine Servicing',
                cost: Number(maintForm.cost) || 0,
                performedBy: maintForm.performedBy || 'Technician',
                description: maintForm.description || '',
                nextMaintenanceDate: maintForm.nextMaintenanceDate ? new Date(maintForm.nextMaintenanceDate).toISOString() : null,
            };
            await equipmentApi.addMaintenance(selectedEquipmentForMaint.id, payload);
            toast.success('Maintenance record logged');
            setMaintModalOpen(false);
            refetch();
        } catch (err) {
            const errData = err.response?.data;
            let errMsg = errData?.message;
            if (!errMsg && errData?.errors) {
                errMsg = Object.values(errData.errors).flat().join(', ');
            }
            toast.error(errMsg || 'Failed to add maintenance record');
        } finally {
            setMaintenanceSaving(false);
        }
    };

    return (
        <div>
            <PageHeader
                title="Machinery & Heavy Equipment"
                subtitle="Plant fleet status, ownership models, rental day costs, and maintenance logs"
            >
                {canManageEquipment() && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Equipment
                    </button>
                )}
            </PageHeader>

            {/* Filters */}
            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="search-input" style={{ minWidth: 240, flex: 1 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input placeholder="Search equipment…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <div style={{ minWidth: 220 }}>
                    <select
                        className="form-control"
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div style={{ minWidth: 180 }}>
                    <select
                        className="form-control"
                        value={availabilityFilter}
                        onChange={e => { setAvailabilityFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Availabilities</option>
                        {AVAILABILITY_OPTS.map(a => (
                            <option key={a} value={a}>{a.replace(/([A-Z])/g, ' $1').trim()}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <SkeletonLoader />
            ) : equipment.length === 0 ? (
                <EmptyState
                    icon={<Truck size={48} color="var(--text-muted)" />}
                    title="No equipment found"
                    description="Register cranes, hydras, backhoes, and transit mixers to your fleet."
                    action={
                        canManageEquipment() && (
                            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 16 }}>
                                <Plus size={16} /> Add Equipment
                            </button>
                        )
                    }
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {equipment.map(eq => (
                        <div key={eq.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5 }}>
                                            {eq.equipmentCode} • {eq.category}
                                        </div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0 0', color: 'var(--text-primary)' }}>{eq.name}</h3>
                                    </div>
                                    <StatusBadge status={eq.availability} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-page)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ownership</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{eq.ownershipType || 'Owned'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Condition</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{eq.condition || 'Good'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily Rental Cost</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                                            {eq.rentalCostPerDay > 0 ? `${formatCurrency(eq.rentalCostPerDay)}/day` : 'Owned (₹0)'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: eq.isActive ? 'var(--success)' : 'var(--danger)' }}>
                                            {eq.isActive ? 'Active Asset' : 'Decommissioned'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                                    {eq.maintenanceDate && <div>Last Service: <strong>{formatDate(eq.maintenanceDate)}</strong></div>}
                                    <div>Next Service Due: <strong>{formatDate(eq.nextMaintenanceDate)}</strong></div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ fontSize: 12, padding: '4px 10px' }}
                                    onClick={() => openMaintenanceModal(eq)}
                                >
                                    <Wrench size={13} style={{ marginRight: 4 }} /> Maintenance
                                </button>

                                {canManageEquipment() && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn-icon" title="Edit" onClick={() => openEdit(eq)}>
                                            <Pencil size={15} />
                                        </button>
                                        {isAdmin() && (
                                            <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(eq.id)}>
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />

            {/* Equipment Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? `Edit Equipment: ${editItem.name}` : 'Register Machinery & Equipment'}
                maxWidth={580}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                        <button type="submit" form="equipForm" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Register Equipment'}
                        </button>
                    </div>
                }
            >
                <form id="equipForm" onSubmit={handleSave}>
                    <div className="grid-2">
                        <FormField label="Equipment Name" required>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. ACE 15XW Hydra Crane"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                list="equipment-name-suggestions"
                                autoComplete="off"
                                required
                            />
                            <datalist id="equipment-name-suggestions">
                                {(EQUIPMENT_SUGGESTIONS[form.category] || Object.values(EQUIPMENT_SUGGESTIONS).flat()).map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                        </FormField>

                        <FormField label="Asset Code" required>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. CRN-008"
                                value={form.equipmentCode}
                                onChange={e => setForm({ ...form, equipmentCode: e.target.value })}
                                required
                            />
                        </FormField>
                    </div>

                    <div className="grid-2">
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

                        <FormField label="Ownership Model">
                            <select
                                className="form-control"
                                value={form.ownershipType}
                                onChange={e => setForm({ ...form, ownershipType: e.target.value })}
                            >
                                {OWNERSHIP_OPTS.map(o => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="grid-3">
                        <FormField label="Availability">
                            <select
                                className="form-control"
                                value={form.availability}
                                onChange={e => setForm({ ...form, availability: e.target.value })}
                            >
                                {AVAILABILITY_OPTS.map(a => (
                                    <option key={a} value={a}>{a.replace(/([A-Z])/g, ' $1').trim()}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Condition">
                            <select
                                className="form-control"
                                value={form.condition}
                                onChange={e => setForm({ ...form, condition: e.target.value })}
                            >
                                {CONDITION_OPTS.map(co => (
                                    <option key={co} value={co}>{co}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Daily Rental Rate (INR)">
                            <input
                                type="number"
                                min="0"
                                className="form-control"
                                placeholder="0 for owned"
                                value={form.rentalCostPerDay}
                                onChange={e => setForm({ ...form, rentalCostPerDay: e.target.value })}
                            />
                        </FormField>
                    </div>

                    <FormField label="Next Scheduled Service Date">
                        <input
                            type="date"
                            className="form-control"
                            value={form.nextMaintenanceDate}
                            onChange={e => setForm({ ...form, nextMaintenanceDate: e.target.value })}
                        />
                    </FormField>
                </form>
            </Modal>

            {/* Maintenance Modal */}
            <Modal
                isOpen={maintModalOpen}
                onClose={() => setMaintModalOpen(false)}
                title={`Maintenance History: ${selectedEquipmentForMaint?.name || ''}`}
                maxWidth={600}
            >
                <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Record Maintenance / Servicing</h4>
                    <form onSubmit={handleSaveMaintenance} style={{ background: 'var(--bg-page)', padding: 14, borderRadius: 8, marginBottom: 20 }}>
                        <div className="grid-2">
                            <FormField label="Date" required>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={maintForm.maintenanceDate}
                                    onChange={e => setMaintForm({ ...maintForm, maintenanceDate: e.target.value })}
                                    required
                                />
                            </FormField>
                            <FormField label="Cost (INR)" required>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-control"
                                    value={maintForm.cost}
                                    onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })}
                                    required
                                />
                            </FormField>
                        </div>
                        <div className="grid-2">
                            <FormField label="Service Type">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Hydraulic oil filter change"
                                    value={maintForm.maintenanceType}
                                    onChange={e => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}
                                />
                            </FormField>
                            <FormField label="Performed By">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Service agency / mechanic"
                                    value={maintForm.performedBy}
                                    onChange={e => setMaintForm({ ...maintForm, performedBy: e.target.value })}
                                />
                            </FormField>
                        </div>
                        <div className="grid-2">
                            <FormField label="Description">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Summary of maintenance work performed"
                                    value={maintForm.description}
                                    onChange={e => setMaintForm({ ...maintForm, description: e.target.value })}
                                />
                            </FormField>
                            <FormField label="Next Service Due Date">
                                <input
                                    type="date"
                                    className="form-control"
                                    value={maintForm.nextMaintenanceDate}
                                    onChange={e => setMaintForm({ ...maintForm, nextMaintenanceDate: e.target.value })}
                                />
                            </FormField>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: 10 }}>
                            <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={maintenanceSaving}>
                                {maintenanceSaving ? 'Saving…' : 'Log Maintenance'}
                            </button>
                        </div>
                    </form>

                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Past Service Records</h4>
                    {maintLoading ? (
                        <SkeletonLoader />
                    ) : maintLogs.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                            No past maintenance logged for this unit.
                        </div>
                    ) : (
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                            {maintLogs.map((ml, idx) => (
                                <div key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span>{ml.maintenanceType || 'Servicing'}</span>
                                        <span>{formatCurrency(ml.cost)}</span>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                        {formatDate(ml.maintenanceDate)} • By {ml.performedBy || 'Technician'}
                                    </div>
                                    {ml.description && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ml.description}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="Remove Equipment"
                message="Are you sure you want to remove this equipment from the fleet? Historical logs will be preserved."
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
