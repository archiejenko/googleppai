import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { Shield, ChevronDown, ChevronRight, ChevronLeft, Download, Filter } from 'lucide-react';

const PAGE_SIZE = 50;

interface OrgUser {
  id: string;
  email: string;
}

interface AuditRow {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor_email?: string;
}

const ACTION_OPTIONS = [
  'company.create', 'company.update', 'company.delete',
  'persona.create', 'persona.update', 'persona.delete',
  'account.reset', 'call.started', 'call.completed', 'call.summarised',
  'retention.deleted', 'role.granted', 'role.revoked',
  'team.created', 'team.member_added', 'team.member_removed',
];

const RESOURCE_TYPE_OPTIONS = [
  'simulated_company', 'simulated_persona', 'account_state',
  'call_summary', 'training_session',
];

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email')
        .order('email');
      if (data) setOrgUsers(data as OrgUser[]);
    })();
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter) query = query.eq('action', actionFilter);
      if (userFilter) query = query.eq('user_id', userFilter);
      if (resourceTypeFilter) query = query.eq('resource_type', resourceTypeFilter);
      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        query = query.lt('created_at', to.toISOString());
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[AuditLog] fetch error:', error);
        setRows([]);
        setTotalCount(0);
        return;
      }

      if (count !== null) setTotalCount(count);

      // Resolve actor emails
      const userIds = [...new Set((data ?? []).map(r => r.user_id).filter(Boolean))] as string[];
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        if (profiles) {
          emailMap = Object.fromEntries(profiles.map(p => [p.id, p.email]));
        }
      }

      const enriched = (data ?? []).map(row => ({
        ...row,
        actor_email: row.user_id ? emailMap[row.user_id] ?? 'Unknown' : undefined,
      }));

      setRows(enriched);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, userFilter, resourceTypeFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExportCsv = async () => {
    if (rows.length === 0) return;
    setExportError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/export-check?table=audit_log`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const body = await resp.json();
      if (!resp.ok || !body.allowed) {
        setExportError('Export not permitted for this data classification');
        return;
      }
    } catch {
      setExportError('Export not permitted for this data classification');
      return;
    }

    const headers = ['Timestamp', 'Actor', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Metadata'];
    const csvRows = rows.map(r => [
      r.created_at,
      r.actor_email ?? 'System',
      r.action,
      r.resource_type ?? '',
      r.resource_id ?? '',
      r.ip_address ?? '',
      JSON.stringify(r.metadata),
    ]);

    const csv = [headers, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setActionFilter('');
    setUserFilter('');
    setResourceTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'rgb(var(--bg-canvas))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: 'rgb(var(--accent-primary))' }} />
          <h1 className="text-2xl font-bold font-display" style={{ color: 'rgb(var(--text-primary))' }}>
            Audit Log
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: showFilters ? 'rgb(var(--accent-primary))' : 'rgb(var(--bg-surface))',
              color: showFilters ? 'rgb(var(--bg-canvas))' : 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border-default))',
            }}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'rgb(var(--bg-surface))',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border-default))',
            }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div
          className="mb-4 px-4 py-3 text-sm"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            color: 'rgb(220, 38, 38)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          }}
        >
          {exportError}
        </div>
      )}

      {/* Immutability notice */}
      <div
        className="mb-4 px-4 py-3 text-sm"
        style={{
          backgroundColor: 'rgba(var(--accent-primary), 0.08)',
          color: 'rgb(var(--text-secondary))',
          border: '1px solid rgba(var(--accent-primary), 0.2)',
        }}
      >
        Audit logs cannot be modified or deleted. They are an immutable record of all system activity.
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="mb-4 p-4 grid grid-cols-2 md:grid-cols-5 gap-4"
          style={{
            backgroundColor: 'rgb(var(--bg-surface))',
            border: '1px solid rgb(var(--border-default))',
          }}
        >
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgb(var(--text-tertiary))' }}>Action</label>
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgb(var(--bg-canvas))',
                color: 'rgb(var(--text-primary))',
                border: '1px solid rgb(var(--border-default))',
              }}
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgb(var(--text-tertiary))' }}>User</label>
            <select
              value={userFilter}
              onChange={e => { setUserFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgb(var(--bg-canvas))',
                color: 'rgb(var(--text-primary))',
                border: '1px solid rgb(var(--border-default))',
              }}
            >
              <option value="">All users</option>
              {orgUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgb(var(--text-tertiary))' }}>Resource Type</label>
            <select
              value={resourceTypeFilter}
              onChange={e => { setResourceTypeFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgb(var(--bg-canvas))',
                color: 'rgb(var(--text-primary))',
                border: '1px solid rgb(var(--border-default))',
              }}
            >
              <option value="">All types</option>
              {RESOURCE_TYPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgb(var(--text-tertiary))' }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgb(var(--bg-canvas))',
                color: 'rgb(var(--text-primary))',
                border: '1px solid rgb(var(--border-default))',
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgb(var(--text-tertiary))' }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 text-sm"
              style={{
                backgroundColor: 'rgb(var(--bg-canvas))',
                color: 'rgb(var(--text-primary))',
                border: '1px solid rgb(var(--border-default))',
              }}
            />
          </div>
          <div className="col-span-2 md:col-span-5 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-sm"
              style={{ color: 'rgb(var(--text-secondary))' }}
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-3 text-sm" style={{ color: 'rgb(var(--text-tertiary))' }}>
        {totalCount !== null ? `${totalCount} entries` : 'Loading...'}
        {totalCount !== null && totalCount > 0 && ` — showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)}`}
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto"
        style={{ border: '1px solid rgb(var(--border-default))' }}
      >
        <table className="w-full text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgb(var(--bg-surface))' }}>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(var(--text-tertiary))' }}>
                Timestamp
              </th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(var(--text-tertiary))' }}>
                Actor
              </th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(var(--text-tertiary))' }}>
                Action
              </th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(var(--text-tertiary))' }}>
                Resource
              </th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: 'rgb(var(--text-tertiary))' }}>
                IP
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'rgb(var(--text-tertiary))' }}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'rgb(var(--text-tertiary))' }}>
                  No audit log entries found.
                </td>
              </tr>
            )}
            {!loading && rows.map(row => (
              <tr key={row.id}>
                <td colSpan={6} className="p-0">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  >
                    <div className="grid grid-cols-[180px_1fr_1fr_1fr_140px_32px] items-center px-4 py-3"
                      style={{ borderBottom: '1px solid rgb(var(--border-subtle))' }}
                    >
                      <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {formatTimestamp(row.created_at)}
                      </span>
                      <span className="truncate">
                        {row.actor_email ?? (
                          <span className="font-mono text-xs" style={{ color: 'rgb(var(--text-tertiary))' }}>System</span>
                        )}
                      </span>
                      <span>
                        <span
                          className="inline-block px-2 py-0.5 text-xs font-mono"
                          style={{
                            backgroundColor: 'rgba(var(--accent-primary), 0.1)',
                            color: 'rgb(var(--accent-primary))',
                          }}
                        >
                          {row.action}
                        </span>
                      </span>
                      <span className="truncate text-xs font-mono" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {row.resource_type ? `${row.resource_type}` : '—'}
                        {row.resource_id ? ` / ${row.resource_id.slice(0, 8)}…` : ''}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-tertiary))' }}>
                        {row.ip_address ?? '—'}
                      </span>
                      <span>
                        {expandedId === row.id
                          ? <ChevronDown className="w-4 h-4" style={{ color: 'rgb(var(--text-tertiary))' }} />
                          : <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--text-tertiary))' }} />
                        }
                      </span>
                    </div>
                  </div>
                  {expandedId === row.id && (
                    <div
                      className="px-6 py-4"
                      style={{
                        backgroundColor: 'rgb(var(--bg-surface))',
                        borderBottom: '1px solid rgb(var(--border-default))',
                      }}
                    >
                      <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                        <div>
                          <span style={{ color: 'rgb(var(--text-tertiary))' }}>Resource ID: </span>
                          <span className="font-mono">{row.resource_id ?? '—'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'rgb(var(--text-tertiary))' }}>User Agent: </span>
                          <span className="font-mono truncate">{row.user_agent ?? '—'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs" style={{ color: 'rgb(var(--text-tertiary))' }}>Metadata:</span>
                        <pre
                          className="mt-1 p-3 text-xs font-mono overflow-x-auto"
                          style={{
                            backgroundColor: 'rgb(var(--bg-canvas))',
                            color: 'rgb(var(--text-secondary))',
                            border: '1px solid rgb(var(--border-subtle))',
                            maxHeight: '200px',
                          }}
                        >
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-30 transition-opacity"
          style={{
            color: 'rgb(var(--text-primary))',
            border: '1px solid rgb(var(--border-default))',
            backgroundColor: 'rgb(var(--bg-surface))',
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span className="text-sm" style={{ color: 'rgb(var(--text-tertiary))' }}>
          Page {page + 1}
        </span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          className="flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-30 transition-opacity"
          style={{
            color: 'rgb(var(--text-primary))',
            border: '1px solid rgb(var(--border-default))',
            backgroundColor: 'rgb(var(--bg-surface))',
          }}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
