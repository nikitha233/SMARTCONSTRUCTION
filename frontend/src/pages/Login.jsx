import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('admin@buildsmart.com');
    const [password, setPassword] = useState('Admin@123!');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const loginAs = (e, p) => {
        setEmail(e);
        setPassword(p);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#eef3f0',
            padding: '24px 16px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 8px 30px rgba(15, 45, 30, 0.08)',
                border: '1px solid var(--border)',
                padding: '36px 32px'
            }}>
                {/* Brand Logo & Name */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: 'var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        boxShadow: '0 4px 12px rgba(26, 71, 49, 0.25)'
                    }}>
                        <Building2 size={28} color="#ffffff" />
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        BuildSmart
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Construction Management System
                    </p>
                </div>

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 18, fontSize: 13 }}>
                        <Lock size={15} /> {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                id="email"
                                type="email"
                                className="form-control"
                                style={{ paddingLeft: 36 }}
                                placeholder="name@buildsmart.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                id="password"
                                type={showPwd ? 'text' : 'password'}
                                className="form-control"
                                style={{ paddingLeft: 36, paddingRight: 40 }}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(s => !s)}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', fontWeight: 700, marginTop: 4, height: 46 }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* 1-Click Demo Accounts */}
                <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Demo Accounts
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Click to autofill</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                            ['Admin', 'admin@buildsmart.com', 'Admin@123!'],
                            ['Proj. Manager', 'pm@buildsmart.com', 'Manager@123!'],
                            ['Site Engineer', 'engineer@buildsmart.com', 'Engineer@123!'],
                            ['Store Manager', 'store@buildsmart.com', 'Store@123!'],
                        ].map(([role, e, p]) => (
                            <button
                                key={role}
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => loginAs(e, p)}
                                style={{
                                    fontSize: 12,
                                    justifyContent: 'center',
                                    padding: '7px 8px',
                                    borderColor: email === e ? 'var(--primary)' : 'var(--border)',
                                    background: email === e ? '#eaf3ee' : 'transparent',
                                    color: email === e ? 'var(--primary)' : 'var(--text-primary)',
                                    fontWeight: email === e ? 700 : 500
                                }}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
