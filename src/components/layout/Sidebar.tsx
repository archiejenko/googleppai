import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Mic,
    ChartBar,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Zap,
    BarChart2,
    Target,
    BookOpen,
    Trophy,
    Calendar,
    Mail,
    Video,
    Bell,
    TrendingUp,
    PhoneCall,
    CreditCard,
    MonitorPlay,
    GitCompareArrows,
    Phone,
    MessageSquare,
    BarChart,
    UserCheck,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { useNotifications } from '../../hooks/useNotifications';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, onOpenPrep }: SidebarProps & { onOpenPrep?: () => void }) {
    const { user, signOut, isManager } = useAuth();
    const { isRevIntel } = useTier();
    const { data: notifications = [] } = useNotifications(user?.id);
    const unreadNotifications = notifications.filter(n => n.unread).length;

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/';
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Mic, label: 'Practice', path: '/training' },
        { icon: Zap, label: 'Journey', path: '/learning-path' },
        { icon: ChartBar, label: 'Drills', path: '/drills' },
        { icon: BarChart2, label: 'Analytics', path: '/dashboard/training' },
        { icon: BookOpen, label: 'Library', path: '/library' },
        { icon: Users, label: 'Team', path: '/team' },
    ];

    const newNavItems: { icon: typeof Bell; label: string; path: string; badge?: number; tierLocked?: boolean }[] = [
        { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
        { icon: Target, label: 'Goals', path: '/goals' },
        { icon: Video, label: 'Recordings', path: '/recordings' },
        { icon: MonitorPlay, label: 'Meetings', path: '/meetings', tierLocked: !isRevIntel },
        { icon: Calendar, label: 'Schedule', path: '/schedule' },
        { icon: Mail, label: 'Inbox', path: '/inbox' },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadNotifications },
        { icon: Settings, label: 'Settings', path: '/profile' },
    ];

    const intelNavItems: { icon: typeof Bell; label: string; path: string; tierLocked?: boolean }[] = [
        { icon: TrendingUp, label: 'Revenue Intel', path: '/dashboard/revenue', tierLocked: !isRevIntel },
        { icon: PhoneCall, label: 'Live Scores', path: '/dashboard/calls', tierLocked: !isRevIntel },
        { icon: MessageSquare, label: 'Insights', path: '/dashboard/insights', tierLocked: !isRevIntel },
        { icon: GitCompareArrows, label: 'Transfer Gap', path: '/transfer-gap', tierLocked: !isRevIntel },
        { icon: CreditCard, label: 'Billing', path: '/settings/billing', tierLocked: false },
    ];

    const salesNavItems: { icon: typeof Bell; label: string; path?: string; onClick?: () => void; tierLocked?: boolean }[] = [
        { icon: MessageSquare, label: 'Objections', path: '/objection-library' },
        { icon: BarChart, label: 'Win / Loss', path: '/win-loss' },
        { icon: Phone, label: 'Pre-Call Prep', onClick: onOpenPrep, tierLocked: !isRevIntel },
        ...(isManager ? [{ icon: UserCheck as typeof Bell, label: 'Coaching', path: '/manager' }] : []),
    ];

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-bg-surface border-r border-border backdrop-blur-xl transition-all duration-300 z-50 flex flex-col
            ${collapsed ? 'w-20' : 'w-64'}`}
        >
            {/* Header / Logo */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <span className={`font-display font-black text-2xl tracking-tighter transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        OAST<span className="text-accent">.</span> <span className="text-[10px] text-text-muted font-mono opacity-50">v1.2</span>
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
                {/* Original nav items */}
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center px-3 py-3 rounded-lg transition-all duration-200 group relative
                            ${isActive
                                ? 'bg-accent/10 text-accent font-medium'
                                : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />

                                <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                    {item.label}
                                </span>

                                {/* Hover Tooltip for Collapsed State */}
                                {collapsed && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-bg-raised border border-border text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {item.label}
                                    </div>
                                )}

                                {/* Active Indicator Strip */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent rounded-r-full" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Divider + section label */}
                <div className="pt-2 pb-1">
                    <div className="border-t border-border/40" />
                </div>
                {!collapsed && (
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-text-muted opacity-50">
                        Features
                    </p>
                )}

                {/* New nav items */}
                {newNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                            ${isActive
                                ? 'bg-accent/10 text-accent font-medium'
                                : item.tierLocked
                                    ? 'text-text-muted hover:bg-bg-raised hover:text-text-secondary opacity-60'
                                    : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />

                                <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                    {item.label}
                                </span>

                                {/* Badge */}
                                {item.badge && item.badge > 0 ? (
                                    <span className={`flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-black bg-accent text-white px-1
                                        ${collapsed ? 'absolute top-1 right-1.5' : 'ml-auto'}`}>
                                        {item.badge}
                                    </span>
                                ) : null}

                                {/* Tier lock badge */}
                                {item.tierLocked && !collapsed && !item.badge ? (
                                    <span className="ml-auto text-[9px] uppercase tracking-widest text-accent/60 border border-accent/20 px-1">
                                        Pro
                                    </span>
                                ) : null}

                                {/* Hover Tooltip */}
                                {collapsed && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-bg-raised border border-border text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 flex items-center gap-2">
                                        {item.label}
                                        {item.badge && item.badge > 0 ? <span className="px-1 text-[10px] bg-accent text-white">{item.badge}</span> : null}
                                        {item.tierLocked ? <span className="text-[9px] text-accent/70">(Revenue Intel)</span> : null}
                                    </div>
                                )}

                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent rounded-r-full" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
                {/* Sales section */}
                <div className="pt-2 pb-1">
                    <div className="border-t border-border/40" />
                </div>
                {!collapsed && (
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-text-muted opacity-50">
                        Sales
                    </p>
                )}

                {salesNavItems.map((item) => {
                    const content = (isActive: boolean) => (
                        <>
                            <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                            <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                {item.label}
                            </span>
                            {item.tierLocked && !collapsed && (
                                <span className="ml-auto text-[9px] uppercase tracking-widest text-accent/60 border border-accent/20 px-1">Pro</span>
                            )}
                            {collapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-bg-raised border border-border text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                    {item.label}{item.tierLocked ? ' (Revenue Intel)' : ''}
                                </div>
                            )}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent rounded-r-full" />
                            )}
                        </>
                    )

                    if (item.onClick) {
                        return (
                            <button
                                key={item.label}
                                onClick={item.onClick}
                                className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${item.tierLocked ? 'text-text-muted opacity-60' : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'}`}
                            >
                                {content(false)}
                            </button>
                        )
                    }

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path!}
                            className={({ isActive }) => `
                                flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                                ${isActive ? 'bg-accent/10 text-accent font-medium' : item.tierLocked ? 'text-text-muted opacity-60' : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'}
                            `}
                        >
                            {({ isActive }) => content(isActive)}
                        </NavLink>
                    )
                })}

                {/* Intelligence section divider */}
                <div className="pt-2 pb-1">
                    <div className="border-t border-border/40" />
                </div>
                {!collapsed && (
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-text-muted opacity-50">
                        Intelligence
                    </p>
                )}

                {intelNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                            ${isActive
                                ? 'bg-accent/10 text-accent font-medium'
                                : item.tierLocked
                                    ? 'text-text-muted hover:bg-bg-raised hover:text-text-secondary opacity-60'
                                    : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                                <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                    {item.label}
                                </span>
                                {item.tierLocked && !collapsed && (
                                    <span className="ml-auto text-[9px] uppercase tracking-widest text-accent/60 border border-accent/20 px-1">
                                        Pro
                                    </span>
                                )}
                                {collapsed && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-bg-raised border border-border text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {item.label}{item.tierLocked ? ' (Revenue Intel)' : ''}
                                    </div>
                                )}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-accent rounded-r-full" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User Controls */}
            <div className="p-3 border-t border-border/50">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-bg-raised text-text-muted hover:text-text-primary transition-colors mb-2"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>

                <button
                    onClick={handleLogout}
                    className={`
                        w-full flex items-center px-3 py-3 rounded-lg text-text-muted hover:bg-status-danger/10 hover:text-status-danger transition-all duration-200
                        ${collapsed ? 'justify-center' : ''}
                    `}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span className={`ml-3 overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                        Sign Out
                    </span>
                </button>
            </div>
        </aside>
    );
}
