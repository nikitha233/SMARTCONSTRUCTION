import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ROUTE_ROLES } from '../utils/roleAccess';
import {
    LayoutDashboard, FolderOpen, HardHat, Package, Users, Truck,
    DollarSign, BarChart2, TrendingUp, FileText, LogOut, Building2, ClipboardList, UserRoundCog,
    ChevronDown, ChevronRight, ArrowDownLeft, ArrowUpRight, ShoppingCart, AlertTriangle, Settings
} from 'lucide-react';

const navItems = [
    {
        group: 'Overview', items: [
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ]
    },
    {
        group: 'Projects', items: [
            { to: '/projects', label: 'Projects', icon: FolderOpen },
            { to: '/stages', label: 'Construction Stages', icon: HardHat },
            { to: '/progress', label: 'Progress Updates', icon: TrendingUp },
        ]
    },
    {
        group: 'Resources', items: [
            { to: '/materials', label: 'Materials', icon: Package },
            { to: '/workers', label: 'Workers', icon: Users },
            { to: '/attendance', label: 'Attendance', icon: ClipboardList },
            { to: '/equipment', label: 'Equipment', icon: Truck },
        ]
    },
    {
        group: 'Finance', items: [
            { to: '/expenses', label: 'Expenses', icon: DollarSign },
            { to: '/budget', label: 'Budget Overview', icon: BarChart2 },
        ]
    },
    {
        group: 'Reports', items: [
            { to: '/reports', label: 'Reports', icon: FileText },
        ]
    },
    {
        group: 'System', items: [
            { to: '/settings', label: 'Settings', icon: Settings },
        ]
    },
];

const MATERIAL_SUBITEMS = [
    { id: 'overview', label: 'Material Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Material Inventory', icon: Package },
    { id: 'stock-in', label: 'Stock In', icon: ArrowDownLeft, color: '#4ade80' },
    { id: 'stock-out', label: 'Stock Out', icon: ArrowUpRight, color: '#fbbf24' },
    { id: 'requests', label: 'Material Requests', icon: ClipboardList },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'allocations', label: 'Project Material Allocation', icon: Building2 },
    { id: 'alerts', label: 'Low Stock Alerts', icon: AlertTriangle, color: '#f87171' },
    { id: 'transactions', label: 'Transaction History', icon: FileText },
    { id: 'reports', label: 'Material Reports', icon: BarChart2 },
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isMaterialsActive = location.pathname.startsWith('/materials');
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'overview';
    const [materialsExpanded, setMaterialsExpanded] = useState(true);

    const handleLogout = () => { logout(); navigate('/login'); };

    const initials = user?.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <>
            {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
            <aside id="app-sidebar" className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <span className="logo-icon">
                            <Building2 size={20} color="#fff" />
                        </span>
                        <div>
                            <h1>BuildSmart</h1>
                            <p>Construction Manager</p>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(group => {
                        const items = group.items.filter(item =>
                            hasRole(...ROUTE_ROLES[item.to.slice(1)])
                        );
                        if (!items.length) return null;
                        return (
                            <div key={group.group}>
                                <div className="nav-section-title">{group.group}</div>
                                {items.map(item => {
                                    if (item.to === '/materials') {
                                        return (
                                            <div key={item.to} className="sidebar-group-item">
                                                <div
                                                    className={`nav-item ${isMaterialsActive ? 'active' : ''}`}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        if (!isMaterialsActive) {
                                                            navigate('/materials?tab=overview');
                                                            setMaterialsExpanded(true);
                                                        } else {
                                                            setMaterialsExpanded(prev => !prev);
                                                        }
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <item.icon size={18} />
                                                        <span>{item.label}</span>
                                                    </div>
                                                    {materialsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </div>

                                                {/* All 11 Material Modules inside the green box */}
                                                {materialsExpanded && (
                                                    <div
                                                        className="sidebar-submenu"
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 2,
                                                            margin: '3px 8px 8px 16px',
                                                            paddingLeft: 10,
                                                            borderLeft: '2px solid rgba(82, 183, 136, 0.45)'
                                                        }}
                                                    >
                                                        {MATERIAL_SUBITEMS.map(sub => {
                                                            const isSubActive = isMaterialsActive && currentTab === sub.id;
                                                            const SubIcon = sub.icon;
                                                            return (
                                                                <Link
                                                                    key={sub.id}
                                                                    to={`/materials?tab=${sub.id}`}
                                                                    onClick={onClose}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 8,
                                                                        padding: '6px 8px',
                                                                        borderRadius: 6,
                                                                        fontSize: 12,
                                                                        color: isSubActive ? '#ffffff' : 'var(--sidebar-text)',
                                                                        background: isSubActive ? 'rgba(82, 183, 136, 0.38)' : 'transparent',
                                                                        fontWeight: isSubActive ? 700 : 500,
                                                                        textDecoration: 'none',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        if (!isSubActive) e.currentTarget.style.background = 'rgba(82, 183, 136, 0.15)';
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        if (!isSubActive) e.currentTarget.style.background = 'transparent';
                                                                    }}
                                                                >
                                                                    <SubIcon size={13} color={isSubActive ? '#ffffff' : (sub.color || 'var(--sidebar-text)')} style={{ flexShrink: 0 }} />
                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {sub.label}
                                                                    </span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                            onClick={onClose}
                                        >
                                            <item.icon size={18} />
                                            <span>{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {hasRole('Admin') && (
                        <div>
                            <div className="nav-section-title">Administration</div>
                            <NavLink
                                to="/user-access"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                onClick={onClose}
                            >
                                <UserRoundCog size={18} />
                                <span>User access</span>
                            </NavLink>
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{initials}</div>
                        <div className="user-details" style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</h4>
                            <p>{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="sidebar-signout-btn"
                        style={{
                            marginTop: 12,
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '9px 12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            borderRadius: 8,
                            color: '#fca5a5',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.color = '#fca5a5';
                        }}
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
