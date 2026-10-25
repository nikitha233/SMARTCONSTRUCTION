import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
    LayoutDashboard, FolderOpen, HardHat, Package, Users, Truck,
    DollarSign, BarChart2, TrendingUp, FileText, LogOut, Building2, ClipboardList
} from 'lucide-react';

const navItems = [
    {
        group: 'Overview', items: [
            { to: '/', label: 'Dashboard', icon: LayoutDashboard },
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
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
                    {navItems.map(group => (
                        <div key={group.group}>
                            <div className="nav-section-title">{group.group}</div>
                            {group.items.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    onClick={onClose}
                                >
                                    <item.icon size={18} />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{initials}</div>
                        <div className="user-details" style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</h4>
                            <p>{user?.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
