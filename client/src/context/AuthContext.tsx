import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../utils/supabase'; // Ensure this path is correct based on project structure
import type { Session } from '@supabase/supabase-js';

type UserRole = 'user' | 'team_lead' | 'admin';

interface User {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    email_confirmed_at: string | null;
    simulatedRole?: UserRole | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    updateUser: (user: Partial<User>) => void;
    simulateRole: (role: UserRole | null) => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Get initial session
        const initAuth = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
                if (initialSession?.user) {
                    await fetchProfile(initialSession.user);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            if (newSession?.user) {
                await fetchProfile(newSession.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (authUser: any) => {
        try {
            // Fetch public profile for role/name
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('name, role, industry')
                .eq('id', authUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            // Construct unified user object
            const newUser: User = {
                id: authUser.id,
                email: authUser.email!,
                email_confirmed_at: authUser.email_confirmed_at || null,
                name: profile?.name || authUser.user_metadata?.name,
                role: profile?.role || 'user',
                simulatedRole: null // Reset simulation on login/refresh
            };

            // Preserve simulation if it was already active in state (optional, but cleaner to reset)
            // But if we just refreshed, we might lose it. Let's keep it simple: Reset.

            setUser(newUser);
        } catch (error) {
            console.error('Profile fetch error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    const updateUser = (updatedUser: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updatedUser });
        }
    };

    const simulateRole = (role: UserRole | null) => {
        if (user && user.role === 'admin') {
            setUser({ ...user, simulatedRole: role });
        } else if (user && role === null) {
            // Reset
            const { simulatedRole, ...realUser } = user;
            setUser(realUser as User);
        }
    };

    // Determine effective role
    const effectiveRole = user?.simulatedRole || user?.role;
    const isAdmin = effectiveRole === 'admin';
    const isManager = effectiveRole === 'admin' || effectiveRole === 'team_lead';

    return (
        <AuthContext.Provider value={{
            user,
            session,
            updateUser,
            simulateRole,
            isAuthenticated: !!session?.user,
            isAdmin,
            isManager,
            isLoading,
            signOut
        }}>
            {children}
            {user?.simulatedRole && (
                <div className="fixed bottom-4 right-4 z-50 bg-status-warning text-black px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse border-2 border-yellow-400">
                    Viewing as: {user.simulatedRole}
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
