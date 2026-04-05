import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import type { OrgTier } from '../constants/pricing';

interface OrgInfo {
    id: string;
    name: string;
    tier: OrgTier;
    seatsLicensed: number;
    pricePerSeatGbp: number;
    onboardingFeePaid: boolean;
    trialEndsAt: string | null;
    weeklyTarget: number;
}

interface TierContextType {
    org: OrgInfo | null;
    isRevIntel: boolean;
    isTrialActive: boolean;
    trialDaysRemaining: number | null;
    weeklyTarget: number;
    isLoading: boolean;
    refresh: () => void;
}

const TierContext = createContext<TierContextType | null>(null);

export const TierProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [org, setOrg] = useState<OrgInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrg = async () => {
        if (!user?.id) { setIsLoading(false); return; }
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single();

            if (!profile?.org_id) { setOrg(null); setIsLoading(false); return; }

            const { data: orgData } = await supabase
                .from('organisations')
                .select('id, name, tier, seats_licensed, price_per_seat_gbp, onboarding_fee_paid, trial_ends_at, weekly_target')
                .eq('id', profile.org_id)
                .single();

            if (orgData) {
                setOrg({
                    id: orgData.id,
                    name: orgData.name,
                    tier: orgData.tier as OrgTier,
                    seatsLicensed: orgData.seats_licensed,
                    pricePerSeatGbp: orgData.price_per_seat_gbp,
                    onboardingFeePaid: orgData.onboarding_fee_paid,
                    trialEndsAt: orgData.trial_ends_at,
                    weeklyTarget: orgData.weekly_target ?? 10,
                });
            }
        } catch (err) {
            console.error('[TierContext] Failed to fetch org:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrg();
        } else {
            setOrg(null);
            setIsLoading(false);
        }
    }, [user?.id, isAuthenticated]);

    const trialEndsAt = org?.trialEndsAt ? new Date(org.trialEndsAt) : null;
    const now = new Date();
    const isTrialActive = trialEndsAt !== null && trialEndsAt > now;
    const trialDaysRemaining = isTrialActive
        ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Admins always have full access regardless of organisation tier
    const isRevIntel =
        isAdmin ||
        (org?.tier === 'revenue_intelligence' && (org.trialEndsAt === null || isTrialActive));

    return (
        <TierContext.Provider value={{
            org,
            isRevIntel,
            isTrialActive,
            trialDaysRemaining,
            weeklyTarget: org?.weeklyTarget ?? 10,
            isLoading,
            refresh: fetchOrg,
        }}>
            {children}
        </TierContext.Provider>
    );
};

export const useTier = () => {
    const ctx = useContext(TierContext);
    if (!ctx) throw new Error('useTier must be used within a TierProvider');
    return ctx;
};
