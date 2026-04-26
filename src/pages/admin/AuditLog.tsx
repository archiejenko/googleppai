import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { ChevronRight, ChevronLeft, Download, Filter } from 'lucide-react';

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

  const activeFilters = [actionFilter, userFilter, resourceTypeFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-desc">System event history, user actions, and security trail.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-[14px] py-[7px] text-[11px] font-semibold rounded-lg border transition-all
              ${showFilters
                ? 'bg-[rgb(var(--accent-primary))] text-white border-[rgb(var(--accent-primary))]'
                : 'bg-transparent text-[rgb(var(--text-secondary))] border-[rgb(var(--border-subtle))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))]'
              }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-[14px] py-[7px] text-[11px] font-semibold rounded-lg border border-[rgb(var(--border-subtle))] bg-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="mb-4 px-4 py-3 text-[12px] rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
          {exportError}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="stat-label block">Action</label>
              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setPage(0); }}
                className="input-os !py-2 !text-[11px]"
              >
                <option value="">All actions</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block">User</label>
              <select
                value={userFilter}
                onChange={e => { setUserFilter(e.target.value); setPage(0); }}
                className="input-os !py-2 !text-[11px]"
              >
                <option value="">All users</option>
                {orgUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block">Resource Type</label>
              <select
                value={resourceTypeFilter}
                onChange={e => { setResourceTypeFilter(e.target.value); setPage(0); }}
                className="input-os !py-2 !text-[11px]"
              >
                <option value="">All types</option>
                {RESOURCE_TYPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="stat-label block">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(0); }}
                className="input-os !py-2 !text-[11px]"
              />
            </div>
            <div>
              <label className="stat-label block">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(0); }}
                className="input-os !py-2 !text-[11px]"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={resetFilters}
              className="text-[11px] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Event Log Card */}
      <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
        <div className="card-title">Event Log</div>

        <table className="table-os">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[rgb(var(--text-muted))]">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-[rgb(var(--text-muted))]">
                  No audit log entries found.
                </td>
              </tr>
            )}
            {!loading && rows.map(row => (
              <tr
                key={row.id}
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <td className="mono-cell">{formatTimestamp(row.created_at)}</td>
                <td className="!text-[rgb(var(--text-primary))] !font-medium">
                  {row.actor_email ?? 'System'}
                </td>
                <td>{row.action}</td>
                <td>
                  {row.resource_type ?? ''}
                  {row.resource_id ? ` / ${row.resource_id.slice(0, 8)}` : ''}
                </td>
                <td>
                  {row.metadata && typeof row.metadata === 'object' && Object.keys(row.metadata).length > 0
                    ? Object.entries(row.metadata).slice(0, 1).map(([k, v]) => `${k}: ${v}`).join('')
                    : ''}
                </td>
                <td className="mono-cell">{row.ip_address ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expanded detail (shown below table for selected row) */}
        {expandedId && (() => {
          const row = rows.find(r => r.id === expandedId);
          if (!row) return null;
          return (
            <div className="mt-3 p-4 rounded-lg" style={{ background: 'rgb(var(--bg-deep))', border: '1px solid rgb(var(--border-default))' }}>
              <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                <div>
                  <span className="text-[rgb(var(--text-muted))]">Resource ID: </span>
                  <span className="font-mono text-[rgb(var(--text-secondary))]">{row.resource_id ?? '--'}</span>
                </div>
                <div>
                  <span className="text-[rgb(var(--text-muted))]">User Agent: </span>
                  <span className="font-mono text-[rgb(var(--text-secondary))] truncate">{row.user_agent ?? '--'}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-[rgb(var(--text-muted))]">Metadata:</span>
                <pre className="mt-1 p-3 text-xs font-mono overflow-x-auto rounded-lg" style={{ background: 'rgb(var(--bg-canvas))', color: 'rgb(var(--text-secondary))', border: '1px solid rgb(var(--border-default))', maxHeight: '200px' }}>
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </div>
            </div>
          );
        })()}

        {/* Pagination */}
        <div className="pagination-row">
          <div className="pagination-info">
            {totalCount !== null
              ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount.toLocaleString()} events`
              : 'Loading...'}
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="page-nav"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
              Previous
            </button>
            <span className="page-num current">{page + 1}</span>
            {hasMore && (
              <button onClick={() => setPage(p => p + 1)} className="page-num">
                {page + 2}
              </button>
            )}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="page-nav"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
