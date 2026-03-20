import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { useTier } from '../context/TierContext';

export interface IntegrationRecord {
    status: 'connected' | 'not_connected' | 'error';
    error_message?: string;
    connected_at?: string;
}

interface UseIntegrationsResult {
    integrations: Record<string, IntegrationRecord>;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Reads live integration status from org_integrations (platform config store).
 * Falls back gracefully — missing rows return 'not_connected'.
 */
export function useIntegrations(): UseIntegrationsResult {
    const { org } = useTier();

    const { data, isLoading, error } = useQuery({
        queryKey: ['integrations', org?.id],
        queryFn: async (): Promise<Record<string, IntegrationRecord>> => {
            if (!org?.id) return {};

            const { data: rows, error: dbError } = await supabase
                .from('org_integrations')
                .select('platform, status, updated_at')
                .eq('org_id', org.id);

            if (dbError) throw dbError;
            if (!rows) return {};

            const result: Record<string, IntegrationRecord> = {};
            for (const row of rows) {
                const isConnected = row.status === 'active' || row.status === 'connected';
                result[row.platform] = {
                    status: isConnected ? 'connected' : 'not_connected',
                    connected_at: row.updated_at ?? undefined,
                };
            }
            return result;
        },
        staleTime: 30_000,
        enabled: !!org?.id,
    });

    return {
        integrations: data ?? {},
        isLoading,
        error: error as Error | null,
    };
}
