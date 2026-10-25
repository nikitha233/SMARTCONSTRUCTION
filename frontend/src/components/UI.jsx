// Reusable UI components

export function StatusBadge({ status }) {
    const map = {
        'Completed': 'badge-green', 'InProgress': 'badge-blue', 'In Progress': 'badge-blue',
        'Planning': 'badge-purple', 'OnHold': 'badge-amber', 'On Hold': 'badge-amber',
        'Cancelled': 'badge-red', 'NotStarted': 'badge-gray', 'Not Started': 'badge-gray',
        'Delayed': 'badge-red', 'Active': 'badge-green', 'Inactive': 'badge-gray',
        'Suspended': 'badge-red', 'Available': 'badge-green', 'Assigned': 'badge-blue',
        'UnderMaintenance': 'badge-amber', 'Unavailable': 'badge-red',
        'Good': 'badge-green', 'Fair': 'badge-amber', 'Poor': 'badge-red',
        'Present': 'badge-green', 'Absent': 'badge-red', 'HalfDay': 'badge-amber',
        'Purchase': 'badge-green', 'Consumption': 'badge-amber', 'Adjustment': 'badge-blue', 'Return': 'badge-purple',
    };
    const cls = map[status] || 'badge-gray';
    const label = status?.replace(/([A-Z])/g, ' $1').trim();
    return <span className={`status-badge ${cls}`}>{label}</span>;
}

export function ProgressBar({ percent, showLabel = true }) {
    const color = percent >= 70 ? 'green' : percent >= 40 ? 'amber' : 'red';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="progress-bar" style={{ flex: 1 }}>
                <div className={`progress-fill ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>
            {showLabel && <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32, color: 'var(--text-secondary)' }}>{percent}%</span>}
        </div>
    );
}

export function LoadingSpinner({ fullPage = false }) {
    if (fullPage) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div className="loading-spinner" style={{ width: 48, height: 48 }} />
        </div>
    );
    return (
        <div className="loading-overlay">
            <div className="loading-spinner" />
        </div>
    );
}

export function EmptyState({ icon, title, description, action }) {
    return (
        <div className="empty-state">
            {icon}
            <h3>{title || 'No data found'}</h3>
            <p>{description || 'Nothing to display here yet.'}</p>
            {action}
        </div>
    );
}

export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = true }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">{title || 'Confirm Action'}</span>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
                    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 600 }) {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}
                    >×</button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}

export function StatCard({ icon, label, value, subValue, iconBg = '#d1fae5', iconColor = '#059669' }) {
    const renderIcon = () => {
        if (!icon) return null;
        if (typeof icon === 'function') {
            return icon({ size: 22, color: iconColor });
        }
        // If it's a valid React element
        if (typeof icon === 'object' && icon.$$typeof && !icon.render) {
            return icon;
        }
        // If it's a forwardRef component from lucide-react
        const IconComponent = icon;
        return <IconComponent size={22} color={iconColor} />;
    };

    return (
        <div className="stat-card">
            <div className="stat-card-top">
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{value}</div>
                </div>
                <div className="stat-icon" style={{ background: iconBg }}>
                    {renderIcon()}
                </div>
            </div>
            {subValue && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subValue}</div>}
        </div>
    );
}

export function PageHeader({ title, subtitle, children }) {
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
        </div>
    );
}

export function FormField({ label, required, error, children }) {
    return (
        <div className="form-group">
            <label className="form-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</label>
            {children}
            {error && <span className="form-error">{error}</span>}
        </div>
    );
}
