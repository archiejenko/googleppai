import React, { createContext, useContext, useState, useEffect } from 'react';

type UserRole = 'user' | 'team_lead' | 'admin';

interface User {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    simulatedRole?: UserRole | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    simulateRole: (role: UserRole | null) => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    const updateUser = (updatedUser: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updatedUser });
        }
    };

    const simulateRole = (role: UserRole | null) => {
        if (user && user.role === 'admin') {
            // Apply simulation only for UI logic
            // The actual backend token still has admin permissions
            const simulatedUser = { ...user, simulatedRole: role };
            setUser(simulatedUser);
        } else if (user && role === null) {
            // Reset simulation
            const { simulatedRole, ...realUser } = user as any;
            setUser(realUser);
        }
    };

    // Determine effective role (simulated or real)
    const effectiveRole = (user as any)?.simulatedRole || user?.role;
    const isAdmin = effectiveRole === 'admin';
    const isManager = effectiveRole === 'admin' || effectiveRole === 'team_lead';

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            updateUser,
            simulateRole,
            isAuthenticated: !!token,
            isAdmin,
            isManager,
        }}>
            {children}
            {/* Visual indicator for role simulation */}
            {(user as any)?.simulatedRole && (
                <div className="fixed bottom-4 right-4 z-50 bg-yellow-500 text-black px-4 py-2 rounded-full font-bold shadow-lg animate-pulse">
                    Viewing as: {(user as any).simulatedRole}
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
