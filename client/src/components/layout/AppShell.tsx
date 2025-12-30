import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    // Auto-collapse on mobile or small screens could go here

    // Check if we are on a "public" page (login/register/landing)
    const isPublic = ['/login', '/register', '/', '/pricing'].includes(location.pathname);

    if (isPublic) {
        return <Outlet />;
    }

    return (
        <div className="layout-shell min-h-screen flex">
            {/* Sidebar Navigation */}
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300
                ${collapsed ? 'ml-20' : 'ml-64'}`}
            >
                <TopBar collapsed={collapsed} setCollapsed={setCollapsed} />

                <main className="flex-1 mt-16 p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto animate-in-up">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
