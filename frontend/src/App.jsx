import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ToastProvider } from './context/ToastContext';
import { SkeletonLoader } from './components/UI';
import ErrorBoundary from './components/ErrorBoundary';
import { ROUTE_ROLES } from './utils/roleAccess';

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
const UserAccess = lazy(() => import('./pages/UserAccess'));
const Settings = lazy(() => import('./pages/Settings'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));

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

function RoleRoute({ roles, children }) {
    const { hasRole } = useAuth();
    return hasRole(...roles) ? children : loadPage(AccessDenied);
}

function RoleHome() {
    const { getHome } = useAuth();
    return <Navigate to={getHome()} replace />;
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
                            <Route index element={<RoleHome />} />
                            <Route path="dashboard" element={<RoleRoute roles={ROUTE_ROLES.dashboard}>{loadPage(Dashboard)}</RoleRoute>} />
                            <Route path="projects" element={<RoleRoute roles={ROUTE_ROLES.projects}>{loadPage(Projects)}</RoleRoute>} />
                            <Route path="projects/:id" element={<RoleRoute roles={ROUTE_ROLES.projects}>{loadPage(ProjectDetail)}</RoleRoute>} />
                            <Route path="stages" element={<RoleRoute roles={ROUTE_ROLES.stages}>{loadPage(Stages)}</RoleRoute>} />
                            <Route path="progress" element={<RoleRoute roles={ROUTE_ROLES.progress}>{loadPage(ProgressUpdates)}</RoleRoute>} />
                            <Route path="materials" element={<RoleRoute roles={ROUTE_ROLES.materials}>{loadPage(Materials)}</RoleRoute>} />
                            <Route path="workers" element={<RoleRoute roles={ROUTE_ROLES.workers}>{loadPage(Workers)}</RoleRoute>} />
                            <Route path="attendance" element={<RoleRoute roles={ROUTE_ROLES.attendance}>{loadPage(Attendance)}</RoleRoute>} />
                            <Route path="equipment" element={<RoleRoute roles={ROUTE_ROLES.equipment}>{loadPage(Equipment)}</RoleRoute>} />
                            <Route path="expenses" element={<RoleRoute roles={ROUTE_ROLES.expenses}>{loadPage(Expenses)}</RoleRoute>} />
                            <Route path="budget" element={<RoleRoute roles={ROUTE_ROLES.budget}>{loadPage(Budget)}</RoleRoute>} />
                            <Route path="reports" element={<RoleRoute roles={ROUTE_ROLES.reports}>{loadPage(Reports)}</RoleRoute>} />
                            <Route path="user-access" element={<RoleRoute roles={ROUTE_ROLES['user-access']}>{loadPage(UserAccess)}</RoleRoute>} />
                            <Route path="settings" element={<RoleRoute roles={ROUTE_ROLES.settings}>{loadPage(Settings)}</RoleRoute>} />
                            <Route path="access-denied" element={loadPage(AccessDenied)} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
