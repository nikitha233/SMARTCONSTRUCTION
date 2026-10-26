import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { Building2, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { getHomePath } from '../utils/roleAccess';

export default function Login() {
    const [mode, setMode] = useState('login');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('SiteEngineer');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { login, signup } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setSuccessMessage('');
        if (mode === 'signup' && !fullName.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        if (mode === 'signup' && password !== confirmPassword) {
            setError('The passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            if (mode === 'signup') {
                const res = await signup(fullName.trim(), email.trim(), password, role);
                toast.success('Your account is ready. Welcome to BuildSmart!');
                navigate(getHomePath(res?.role || role), { replace: true });
            } else {
                const account = await login(email.trim(), password);
                toast.success('Welcome back!');
                navigate(getHomePath(account.role), { replace: true });
            }
        } catch (err) {
            const fallback = mode === 'signup'
                ? 'Unable to create your account. Please check your details and try again.'
                : 'Unable to sign in. Check your email and password and try again.';
            setError(err.response?.data?.message || err.userMessage || fallback);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url('/construction-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            padding: '24px 16px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '430px',
                background: '#ffffff',
                borderRadius: '20px',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                padding: '38px 34px'
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

                {successMessage && (
                    <div style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginBottom: 18,
                        fontSize: 13,
                        lineHeight: 1.4
                    }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>✓ Request Submitted</div>
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 18, fontSize: 13 }}>
                        <Lock size={15} /> {error}
                    </div>
                )}

                <h2 style={{ fontSize: 19, margin: '0 0 18px', color: 'var(--text-primary)' }}>
                    {mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
                </h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {mode === 'signup' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="fullName" style={{ fontWeight: 600 }}>Full name</label>
                            <div style={{ position: 'relative' }}>
                                <UserRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    id="fullName"
                                    type="text"
                                    className="form-control"
                                    style={{ paddingLeft: 36 }}
                                    placeholder="Your full name"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    autoComplete="name"
                                    maxLength={120}
                                    required
                                />
                            </div>
                        </div>
                    )}
                    {mode === 'signup' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="role" style={{ fontWeight: 600 }}>Select Role</label>
                            <select
                                id="role"
                                className="form-control"
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                required
                            >
                                <option value="Admin">Administrator</option>
                                <option value="ProjectManager">Project Manager</option>
                                <option value="SiteEngineer">Site Engineer</option>
                                <option value="StoreManager">Store Manager</option>
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email" style={{ fontWeight: 600 }}>Email Address</label>
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
                        <label className="form-label" htmlFor="password" style={{ fontWeight: 600 }}>Password</label>
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
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                minLength={mode === 'signup' ? 8 : undefined}
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

                    {mode === 'signup' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="confirmPassword" style={{ fontWeight: 600 }}>Confirm password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="form-control"
                                placeholder="Enter your password again"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                minLength={6}
                                required
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use at least 8 characters with an uppercase letter, lowercase letter, and number.</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', fontWeight: 700, marginTop: 4, height: 46 }}
                    >
                        {loading ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {mode === 'signup' ? 'Already have an account?' : 'New to BuildSmart?'}{' '}
                    <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
                        disabled={loading}
                    >
                        {mode === 'signup' ? 'Sign in' : 'Create an account'}
                    </button>
                </p>
                {mode === 'signup' && (
                    <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                        Select your assigned role to access the corresponding dashboard and features upon registration.
                    </p>
                )}
            </div>
        </div>
    );
}
