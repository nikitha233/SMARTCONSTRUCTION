import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function AccessDenied() {
    return (
        <div className="card" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center', padding: 32 }}>
            <ShieldX size={40} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ margin: '0 0 8px' }}>Access denied</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                Your account role does not have permission to view this page. Contact an administrator if you need access.
            </p>
            <Link className="btn btn-primary" to="/">Go to your home page</Link>
        </div>
    );
}
