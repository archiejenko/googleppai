import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../utils/supabase'; // Ensure this path is correct based on project structure
import type { Session } from '@supabase/supabase-js';
import { posthog, isPostHogEnabled } from '../lib/posthog';

type UserRole = 'user' | 'team_lead' | 'admin';

interface User {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    email_confirmed_at: string | null;
    simulatedRole?: UserRole | null;
    onboarding_completed?: boolean;
    avatar_url?: string | null;
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
    const fetchingProfileFor = useRef<string | null>(null);
    const userRef = useRef<User | null>(null);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        const handleFocus = async () => {
            if (document.visibilityState !== 'visible') return;
            // Only re-validate the JWT — do NOT re-fetch the profile here.
            // Profile data (including onboarding_completed) is loaded on login and
            // updated explicitly on user actions. Re-fetching on every tab switch
            // causes race conditions that incorrectly reset onboarding_completed to false.
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('[Auth] Session check error on focus:', error);
                return;
            }
            if (currentSession?.user) {
                setSession(currentSession);
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, []);

    useEffect(() => {
        // 1. Get initial session
        const initAuth = async () => {
            try {
                console.log('[Auth] Initializing auth...');
                const { data: { session: initialSession } } = await supabase.auth.getSession();

                // === JWT INTEGRITY CHECK ===
                // If we have a session, verify it belongs to this project
                if (initialSession?.access_token) {
                    try {
                        const token = initialSession.access_token;
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const expectedRef = import.meta.env.VITE_SUPABASE_URL?.split('.')[0].split('//')[1];

                        if (payload.ref && expectedRef && payload.ref !== expectedRef) {
                            console.warn(`[Auth] JWT project mismatch detected. (Token: ${payload.ref} vs App: ${expectedRef}). Clearing session.`);
                            await supabase.auth.signOut();
                            setSession(null);
                            setUser(null);
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error('[Auth] Mismatch check failed', e);
                    }
                }

                setSession(initialSession);
                if (initialSession?.user) {
                    await fetchProfile(initialSession.user);
                } else {
                    setUser(null);
                }
            } catch (error: unknown) {
                console.error('Error initializing auth:', error);
            } finally {
                setIsLoading(false);
            }
        };
        initAuth();

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            // ... existing auth state change logic ...
            console.log('Auth state changed:', event, newSession?.user?.id);
            setSession(newSession);

            if (event === 'TOKEN_REFRESHED') {
                console.log('[Auth] Token refreshed successfully.');
            }

            if (newSession?.user) {
                await fetchProfile(newSession.user);
            } else {
                console.log('No user in session, clearing state. Event:', event);
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (authUser: { id: string; email?: string; email_confirmed_at?: string; user_metadata?: { name?: string } }) => {
        if (fetchingProfileFor.current === authUser.id) {
            console.log('[Auth] Profile fetch already in progress for:', authUser.id);
            return;
        }
        fetchingProfileFor.current = authUser.id;
        try {
            console.log('[Auth] Fetching profile for:', authUser.id);
            // Fetch public profile for role/name with timeout
            const profilePromise = supabase
                .from('profiles')
                .select('name, role, onboarding_completed, avatar_url')
                .eq('id', authUser.id)
                .single();

            const timeoutPromise = new Promise<{ data: { name: string; role: UserRole; onboarding_completed?: boolean; avatar_url?: string | null } | null, error: any }>((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 30000)
            );

            // Type the race result
            type ProfileResponse = { data: { name: string; role: UserRole; onboarding_completed?: boolean; avatar_url?: string | null } | null, error: any };
            const result = await Promise.race([profilePromise, timeoutPromise]) as ProfileResponse;
            const { data: profile, error } = result;

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
                // Non-blocking error logging
            }

            // Construct unified user object.
            // If the DB returns null/undefined for onboarding_completed but we already
            // know it was true (from previous fetch), preserve the true value.
            const existingOnboardingCompleted = userRef.current?.onboarding_completed;
            const newUser: User = {
                id: authUser.id,
                email: authUser.email!,
                email_confirmed_at: authUser.email_confirmed_at || null,
                name: profile?.name || authUser.user_metadata?.name,
                role: profile?.role || 'user',
                simulatedRole: null,
                onboarding_completed: profile?.onboarding_completed
                    ?? (existingOnboardingCompleted === true ? true : false),
                avatar_url: profile?.avatar_url ?? null,
            };

            setUser(newUser);
            if (isPostHogEnabled) {
                posthog.identify(newUser.id, {
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                });
            }
        } catch (error: unknown) {
            console.error('Profile fetch error', error);

            // Graceful Fallback — use real name from metadata or derive from email.
            // Preserve onboarding_completed if we already knew it to be true.
            const fallbackUser: User = {
                id: authUser.id,
                email: authUser.email || '',
                email_confirmed_at: null,
                name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
                role: 'user',
                simulatedRole: null,
                onboarding_completed: userRef.current?.onboarding_completed ?? false,
            };
            setUser(fallbackUser);

        } finally {
            fetchingProfileFor.current = null;
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        if (isPostHogEnabled) posthog.reset();
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
                <div className="fixed bottom-4 right-4 z-50 bg-[rgb(var(--bg-canvas))] text-[rgb(var(--accent-primary))] px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgb(var(--accent-glow)/0.5)] border-2 border-[rgb(var(--accent-primary))] animate-pulse">
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
