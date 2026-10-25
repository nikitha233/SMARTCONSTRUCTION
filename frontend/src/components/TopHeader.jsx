import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopHeader({ title, subtitle, onMenuClick }) {
    const { user } = useAuth();
    return (
        <header className="top-header">
            <button className="btn-icon menu-toggle" onClick={onMenuClick} aria-label="Menu">
                <Menu size={20} />
            </button>
            <div className="header-title">
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="header-actions">
                <button className="btn-icon" aria-label="Notifications">
                    <Bell size={18} />
                    <span className="badge">3</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
