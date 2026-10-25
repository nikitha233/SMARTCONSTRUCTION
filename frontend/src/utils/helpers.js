export const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateShort = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const formatNumber = (num, decimals = 2) =>
    num === null || num === undefined ? '—' : Number(num).toFixed(decimals);

export const getProgressColor = (pct) => {
    if (pct >= 70) return 'green';
    if (pct >= 40) return 'amber';
    return 'red';
};

export const getBudgetColor = (actual, estimated) => {
    const ratio = estimated > 0 ? actual / estimated : 0;
    if (ratio > 1) return 'red';
    if (ratio > 0.85) return 'amber';
    return 'green';
};

export const getStatusBadgeClass = (status) => {
    const map = {
        'Completed': 'badge-green', 'InProgress': 'badge-blue', 'In Progress': 'badge-blue',
        'Planning': 'badge-purple', 'OnHold': 'badge-amber', 'On Hold': 'badge-amber',
        'Cancelled': 'badge-red', 'NotStarted': 'badge-gray', 'Not Started': 'badge-gray',
        'Delayed': 'badge-red', 'Active': 'badge-green', 'Inactive': 'badge-gray',
        'Available': 'badge-green', 'Assigned': 'badge-blue', 'UnderMaintenance': 'badge-amber',
        'Unavailable': 'badge-red', 'Good': 'badge-green', 'Fair': 'badge-amber', 'Poor': 'badge-red',
        'Present': 'badge-green', 'Absent': 'badge-red', 'HalfDay': 'badge-amber',
        'Low': 'badge-red', 'Adequate': 'badge-green',
        'Purchase': 'badge-green', 'Consumption': 'badge-amber', 'Adjustment': 'badge-blue',
    };
    return map[status] || 'badge-gray';
};

export const daysUntil = (date) => {
    if (!date) return null;
    const diff = new Date(date) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const isOverdue = (date) => daysUntil(date) < 0;

export const downloadCSV = (data, filename) => {
    if (!data || !data.length) return;
    const keys = Object.keys(data[0]);
    const header = keys.join(',');
    const rows = data.map(row => keys.map(k => {
        const val = row[k];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'export.csv';
    a.click(); URL.revokeObjectURL(url);
};

export const truncate = (str, n = 60) => str && str.length > n ? str.slice(0, n) + '…' : str;

export const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
};
