import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './layouts/AppLayout';
import { LoadingSpinner } from './components/UI';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Stages from './pages/Stages';
import ProgressUpdates from './pages/ProgressUpdates';
import Materials from './pages/Materials';
import Workers from './pages/Workers';
import Attendance from './pages/Attendance';
import Equipment from './pages/Equipment';
import Expenses from './pages/Expenses';
import Budget from './pages/Budget';
import Reports from './pages/Reports';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner fullPage />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function PublicOnlyRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner fullPage />;
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
                                    <Login />
                                </PublicOnlyRoute>
                            }
                        />

                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Dashboard />} />
                            <Route path="projects" element={<Projects />} />
                            <Route path="projects/:id" element={<ProjectDetail />} />
                            <Route path="stages" element={<Stages />} />
                            <Route path="progress" element={<ProgressUpdates />} />
                            <Route path="materials" element={<Materials />} />
                            <Route path="workers" element={<Workers />} />
                            <Route path="attendance" element={<Attendance />} />
                            <Route path="equipment" element={<Equipment />} />
                            <Route path="expenses" element={<Expenses />} />
                            <Route path="budget" element={<Budget />} />
                            <Route path="reports" element={<Reports />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
