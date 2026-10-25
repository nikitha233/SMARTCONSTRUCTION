import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ToastProvider } from './context/ToastContext';
import { SkeletonLoader } from './components/UI';
import ErrorBoundary from './components/ErrorBoundary';

const AppLayout = lazy(() => import('./layouts/AppLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Stages = lazy(() => import('./pages/Stages'));
const ProgressUpdates = lazy(() => import('./pages/ProgressUpdates'));
const Materials = lazy(() => import('./pages/Materials'));
const Workers = lazy(() => import('./pages/Workers'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Budget = lazy(() => import('./pages/Budget'));
const Reports = lazy(() => import('./pages/Reports'));

function loadPage(Component) {
    return (
        <Suspense fallback={<SkeletonLoader fullPage variant="cards" rows={4} />}>
            <Component />
        </Suspense>
    );
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <SkeletonLoader fullPage variant="cards" rows={4} />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function PublicOnlyRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <SkeletonLoader fullPage variant="cards" rows={4} />;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <PublicOnlyRoute>
                                    {loadPage(Login)}
                                </PublicOnlyRoute>
                            }
                        />

                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary>{loadPage(AppLayout)}</ErrorBoundary>
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={loadPage(Dashboard)} />
                            <Route path="projects" element={loadPage(Projects)} />
                            <Route path="projects/:id" element={loadPage(ProjectDetail)} />
                            <Route path="stages" element={loadPage(Stages)} />
                            <Route path="progress" element={loadPage(ProgressUpdates)} />
                            <Route path="materials" element={loadPage(Materials)} />
                            <Route path="workers" element={loadPage(Workers)} />
                            <Route path="attendance" element={loadPage(Attendance)} />
                            <Route path="equipment" element={loadPage(Equipment)} />
                            <Route path="expenses" element={loadPage(Expenses)} />
                            <Route path="budget" element={loadPage(Budget)} />
                            <Route path="reports" element={loadPage(Reports)} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
