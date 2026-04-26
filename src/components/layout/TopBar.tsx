import { useState } from 'react';
import { Search, Bell, Menu } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationsDropdown from '../../features/notifications/NotificationsDropdown';

interface TopBarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function TopBar({ collapsed, setCollapsed }: TopBarProps) {
    const { user, signOut } = useAuth();
    const [notifOpen, setNotifOpen] = useState(false);
    const { data: notifications = [], markRead, markAllRead } = useNotifications(user?.id);

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <header
            className={`fixed top-0 right-0 h-12 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border-default))] z-40 transition-all duration-300 flex items-center justify-between px-5
            ${collapsed ? 'left-[56px]' : 'left-[200px]'}`}
        >
            {/* Left: Mobile Toggle & Search */}
            <div className="flex items-center gap-4">
                <button
                    className="md:hidden p-1.5 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <Menu className="w-[18px] h-[18px]" />
                </button>

                <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-56 pl-8 pr-3 py-1.5 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] rounded-lg text-xs text-[rgb(var(--text-primary))] font-sans focus:outline-none focus:border-[#FF6B6B] transition-all placeholder:text-[rgb(var(--text-muted))]"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* Notifications Bell */}
                <div className="relative">
                    <button
                        onClick={() => setNotifOpen(o => !o)}
                        className="relative p-1.5 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                    >
                        <Bell className="w-[18px] h-[18px]" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-[7px] h-[7px] bg-[#FF6B6B] rounded-full border-[1.5px] border-[rgb(var(--bg-surface))]" />
                        )}
                    </button>
                    <NotificationsDropdown
                        open={notifOpen}
                        onClose={() => setNotifOpen(false)}
                        notifications={notifications}
                        onMarkAllRead={markAllRead}
                        onMarkRead={markRead}
                    />
                </div>

                <div className="flex items-center gap-2 pl-3 border-l border-[rgb(var(--border-default))]">
                    <div className="w-7 h-7 bg-[rgba(255,107,107,0.12)] border border-[rgba(255,107,107,0.3)] flex items-center justify-center flex-shrink-0 rounded-md">
                        <span className="text-[10px] font-display font-bold text-[#FF6B6B] uppercase leading-none">
                            {(user?.name || user?.email || 'U').slice(0, 2)}
                        </span>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[11px] font-semibold text-[rgb(var(--text-primary))] leading-none">{user?.name || user?.email?.split('@')[0] || 'User'}</p>
                        <p className="text-[10px] text-[rgb(var(--text-muted))] capitalize">{user?.role || 'User'}</p>
                    </div>
                    <button onClick={signOut} className="ml-2 text-[10px] text-[rgb(var(--text-muted))] hover:text-[#F87171] underline transition-colors">
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
}
