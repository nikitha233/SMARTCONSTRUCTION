import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';

const routeTitles = {
    '/': { title: 'Dashboard', subtitle: 'Welcome to BuildSmart' },
    '/projects': { title: 'Projects', subtitle: 'Manage construction projects' },
    '/stages': { title: 'Construction Stages', subtitle: 'Track project stages' },
    '/progress': { title: 'Progress Updates', subtitle: 'Daily site progress reports' },
    '/materials': { title: 'Materials', subtitle: 'Inventory management' },
    '/workers': { title: 'Workers', subtitle: 'Workforce management' },
    '/attendance': { title: 'Attendance', subtitle: 'Daily attendance records' },
    '/equipment': { title: 'Equipment', subtitle: 'Machinery & equipment' },
    '/expenses': { title: 'Expenses', subtitle: 'Project expenditure' },
    '/budget': { title: 'Budget Overview', subtitle: 'Financial tracking' },
    '/reports': { title: 'Reports', subtitle: 'Analytics & exports' },
};

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const pathKey = '/' + location.pathname.split('/')[1];
    const { title, subtitle } = routeTitles[pathKey] || { title: 'BuildSmart', subtitle: '' };

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="main-content">
                <TopHeader title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(o => !o)} />
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
