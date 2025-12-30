import { Search, Bell, Menu } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

interface TopBarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function TopBar({ collapsed, setCollapsed }: TopBarProps) {
    return (
        <header
            className={`fixed top-0 right-0 h-16 bg-bg-surface/80 backdrop-blur-md border-b border-border z-40 transition-all duration-300 flex items-center justify-between px-6
            ${collapsed ? 'left-20' : 'left-64'}`}
        >
            {/* Left: Mobile Toggle & Search */}
            <div className="flex items-center gap-6">
                <button
                    className="md:hidden p-2 text-text-muted hover:text-text-primary"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Command Palette Trigger */}
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search or type command..."
                        className="w-64 pl-10 pr-4 py-2 bg-bg-canvas border border-border rounded-lg text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs text-text-muted bg-bg-surface border border-border rounded">Ctrl</kbd>
                        <kbd className="px-1.5 py-0.5 text-xs text-text-muted bg-bg-surface border border-border rounded">K</kbd>
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-text-muted hover:text-text-primary hover:bg-bg-raised rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-bg-surface"></span>
                </button>

                <div className="h-6 w-px bg-border mx-2"></div>

                <ThemeToggle />

                <div className="flex items-center gap-3 ml-2 pl-2 border-l border-border/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-blue-500 p-[1px]">
                        <div className="w-full h-full rounded-full bg-bg-surface p-0.5">
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Archie"
                                alt="User"
                                className="w-full h-full rounded-full bg-bg-canvas"
                            />
                        </div>
                    </div>
                    <div className="hidden md:block text-sm">
                        <p className="font-medium text-text-primary leading-none">Archie Jenko</p>
                        <p className="text-text-muted text-xs">Admin</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
