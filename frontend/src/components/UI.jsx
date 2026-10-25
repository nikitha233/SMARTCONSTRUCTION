import { useState } from 'react';

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

export function SkeletonLoader({ fullPage = false, variant = 'table', rows = 5 }) {
    return (
        <div className={fullPage ? 'page-skeleton page-skeleton-full' : 'page-skeleton'} aria-busy="true" aria-label="Loading content">
            <div className="skeleton-block skeleton-heading" />
            <div className="skeleton-block skeleton-toolbar" />
            <div className={`skeleton-content skeleton-${variant}`}>
                {Array.from({ length: rows }, (_, index) => (
                    <div className="skeleton-block skeleton-row" key={index}>
                        <span />
                        <span />
                        <span />
                    </div>
                ))}
            </div>
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

export function DataTable({ children, className = 'table-responsive' }) {
    return <div className={className}>{children}</div>;
}

export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = true }) {
    const [confirming, setConfirming] = useState(false);
    if (!isOpen) return null;

    const confirm = async () => {
        if (confirming) return;
        setConfirming(true);
        try {
            await onConfirm();
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={confirming ? undefined : onCancel}>
            <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">{title || 'Confirm Action'}</span>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onCancel} disabled={confirming}>Cancel</button>
                    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={confirming}>
                        {confirming ? 'Working…' : 'Confirm'}
                    </button>
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

export function Pagination({ page, pageSize, totalCount, onPageChange }) {
    const pageCount = Math.ceil(totalCount / pageSize);
    if (pageCount <= 1) return null;

    return (
        <div className="pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
                <span style={{ alignSelf: 'center', fontSize: 13 }}>Page {page} of {pageCount}</span>
                <button className="btn btn-outline btn-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</button>
            </div>
        </div>
    );
}
