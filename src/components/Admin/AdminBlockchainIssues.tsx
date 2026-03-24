import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertOctagon, CheckCircle, Clock, XCircle,
  RefreshCw, X, Zap, Database, Link, Activity,
  FileText, Lock, User, Terminal, Loader2, Send, Check
} from 'lucide-react';

interface AdminBlockchainIssuesProps { onBack: () => void; }

/* ─── helpers ────────────────────────────────────────────────── */
const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STATUS = {
  open:          { text: '#fca5a5', pill: '#dc2626', border: '#7f1d1d', bg: '#1a0000', label: 'Open' },
  investigating: { text: '#fde68a', pill: '#d97706', border: '#78350f', bg: '#1c1408', label: 'Investigating' },
  resolved:      { text: '#86efac', pill: '#16a34a', border: '#14532d', bg: '#052e16', label: 'Resolved' },
} as const;

function timeAgo(d: string | Date): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/* ─── Issue Action Panel ─────────────────────────────────────── */
interface IssueActionPanelProps {
  issue:     any;
  onClose:   () => void;
  onUpdated: () => void;
}

const IssueActionPanel: React.FC<IssueActionPanelProps> = ({ issue, onClose, onUpdated }) => {
  const [chainLen,     setChainLen]   = useState<number | null>(null);
  const [verifyResult, setVerify]     = useState<any>(null);
  const [verifying,    setVerifying]  = useState(false);
  const [statusChoice, setChoice]     = useState<'investigating' | 'resolved' | ''>('');
  const [note,         setNote]       = useState('');
  const [applying,     setApplying]   = useState(false);
  const [actionMsg,    setActionMsg]  = useState<string | null>(null);
  const [stepsDone,    setStepsDone]  = useState<Set<string>>(new Set());

  /* Fetch chain length for context */
  useEffect(() => {
    fetch('/api/blockchain', { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => setChainLen(rows.length))
      .catch(() => setChainLen(null));
  }, []);

  const runVerify = async () => {
    setVerifying(true);
    try {
      const res  = await fetch('/api/blockchain/verify-full', {
        method:  'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setVerify(data);
      setStepsDone(prev => new Set([...prev, 'verify']));
    } catch (err: any) {
      setVerify({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const applyStatus = async () => {
    if (!statusChoice) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/blockchain/issues/${issue.id}/status`, {
        method:  'PATCH',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: statusChoice, note }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActionMsg(`✓ Issue marked as "${statusChoice}"${note ? ' · Note saved to audit log' : ''}`);
      setStepsDone(prev => new Set([...prev, 'status']));
      onUpdated();
    } catch (err: any) {
      setActionMsg(`✕ ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const st = STATUS[issue.status as keyof typeof STATUS] ?? STATUS.open;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#0d1117', border: '1px solid #30363d' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: '#21262d' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#ef444422', border: '1px solid #991b1b' }}
            >
              <AlertOctagon className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Blockchain Issue — Admin Action</div>
              <div className="text-gray-600 text-xs font-mono">{timeAgo(issue.created_at)} · reported by {issue.user_role}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Issue Summary */}
        <div className="px-5 py-3 border-b shrink-0" style={{ borderColor: '#21262d', background: '#1a0000' }}>
          <p className="text-gray-200 text-sm leading-relaxed">{issue.alert_message}</p>
          <div className="flex gap-3 mt-2 text-xs text-gray-500 font-mono flex-wrap">
            <span><Clock className="w-3 h-3 inline mr-1" />{new Date(issue.created_at).toLocaleString()}</span>
            <span
              className="px-2 py-0.5 rounded-full"
              style={{ background: `${st.pill}22`, color: st.text, border: `1px solid ${st.border}` }}
            >
              {st.label}
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* Step 1 — Server Verify */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background:   stepsDone.has('verify') ? '#0a1a0a' : '#111827',
              borderColor:  stepsDone.has('verify') ? '#14532d' : '#21262d',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold"
                style={{
                  background:  stepsDone.has('verify') ? '#052e16' : '#1f2937',
                  border:      `1px solid ${stepsDone.has('verify') ? '#16a34a' : '#374151'}`,
                  color:       stepsDone.has('verify') ? '#86efac' : '#6b7280',
                }}
              >
                {stepsDone.has('verify') ? <CheckCircle className="w-3.5 h-3.5" /> : '1'}
              </div>
              <Zap className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Run Full Server Verification</div>
                <p className="text-gray-600 text-xs">
                  Re-reads all {chainLen !== null ? chainLen : '…'} blockchain_logs rows from PostgreSQL
                  and checks every hash link server-side.
                </p>
              </div>
            </div>

            <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: '#21262d' }}>
              <button
                onClick={runVerify}
                disabled={verifying}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all disabled:opacity-50"
                style={{ background: '#0c2a2a', color: '#2dd4bf', border: '1px solid #0e5048' }}
              >
                {verifying
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</>
                  : <><Terminal className="w-3.5 h-3.5" /> Run Server Verification</>}
              </button>

              {verifyResult && !verifyResult.error && (
                <div
                  className="rounded-lg border p-3 text-xs font-mono space-y-1.5"
                  style={{
                    background:  verifyResult.valid ? '#052e16' : '#1a0000',
                    borderColor: verifyResult.valid ? '#14532d' : '#7f1d1d',
                  }}
                >
                  <div className={verifyResult.valid ? 'text-emerald-400' : 'text-red-400'}>
                    {verifyResult.valid
                      ? `✓ Chain intact — all ${verifyResult.totalBlocks} blocks valid`
                      : `✕ ${verifyResult.brokenBlocks?.length ?? 0} broken block(s) confirmed`}
                  </div>
                  <div className="text-gray-500">
                    Verified at: {new Date(verifyResult.verifiedAt).toLocaleString()}
                  </div>
                  {verifyResult.brokenBlocks?.map((b: any) => (
                    <div
                      key={b.blockIndex}
                      className="mt-2 rounded p-2 space-y-1"
                      style={{ background: '#2d0000', border: '1px solid #7f1d1d' }}
                    >
                      <div className="text-red-400 font-bold">Block #{b.blockIndex} — {b.role}</div>
                      <div><span className="text-gray-500">Record ID: </span><span className="text-gray-300">{b.recordId}</span></div>
                      <div><span className="text-gray-500">Timestamp: </span><span className="text-gray-300">{b.timestamp ? new Date(b.timestamp).toLocaleString() : '—'}</span></div>
                      <div><span className="text-gray-500">Expected prev: </span><span className="text-green-400 break-all">{b.expectedPrevHash?.slice(0, 32)}…</span></div>
                      <div><span className="text-gray-500">Actual prev:   </span><span className="text-red-400 break-all">{b.actualPrevHash?.slice(0, 32)}…</span></div>
                    </div>
                  ))}
                </div>
              )}
              {verifyResult?.error && (
                <div className="text-red-400 text-xs font-mono">✕ Verification error: {verifyResult.error}</div>
              )}
            </div>
          </div>

          {/* Step 2 — Investigation Checklist */}
          <div className="rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#21262d' }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono"
                style={{ background: '#1f2937', border: '1px solid #374151', color: '#6b7280' }}
              >
                2
              </div>
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="text-white text-sm font-medium">Investigation Checklist</div>
                <p className="text-gray-600 text-xs">Steps to perform in the database for blockchain tampering.</p>
              </div>
            </div>
            <div className="border-t px-4 py-3 space-y-2.5" style={{ borderColor: '#21262d' }}>
              {[
                { icon: Database, text: 'Check if rows were modified: query blockchain_logs WHERE id = <broken_record_id> and compare the stored hash against an independently computed SHA-256.' },
                { icon: User,     text: 'Check activity_logs for any UPDATE or DELETE on blockchain_logs around the tamper timestamp.' },
                { icon: Lock,     text: 'Verify PostgreSQL row-level security is enabled on blockchain_logs — only INSERT should be permitted.' },
                { icon: Activity, text: "Cross-reference the broken record's record_id against its source table (medical_records, bills, claims) to check if source data was altered." },
                { icon: Shield,   text: 'If tampering is confirmed, preserve the broken chain as-is for audit evidence before taking any corrective action.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <item.icon className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-gray-400 leading-relaxed font-sans">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 — Update Status */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background:  stepsDone.has('status') ? '#0a1a0a' : '#111827',
              borderColor: stepsDone.has('status') ? '#14532d' : '#21262d',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold"
                style={{
                  background:  stepsDone.has('status') ? '#052e16' : '#1f2937',
                  border:      `1px solid ${stepsDone.has('status') ? '#16a34a' : '#374151'}`,
                  color:       stepsDone.has('status') ? '#86efac' : '#6b7280',
                }}
              >
                {stepsDone.has('status') ? <CheckCircle className="w-3.5 h-3.5" /> : '3'}
              </div>
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-white text-sm font-medium">Update Issue Status</div>
                <p className="text-gray-600 text-xs">Update the alert in the database and log the resolution.</p>
              </div>
            </div>

            <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: '#21262d' }}>
              {/* Status choice */}
              <div>
                <label className="text-gray-500 text-xs font-mono block mb-1.5">New Status</label>
                <div className="flex gap-2">
                  {(['investigating', 'resolved'] as const).map(s => {
                    const cfg = STATUS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => setChoice(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border"
                        style={{
                          background:  statusChoice === s ? `${cfg.pill}22` : '#0d1117',
                          color:       statusChoice === s ? cfg.text        : '#6b7280',
                          borderColor: statusChoice === s ? cfg.border      : '#21262d',
                        }}
                      >
                        {s === 'investigating'
                          ? <Clock         className="w-3 h-3" />
                          : <CheckCircle   className="w-3 h-3" />}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resolution note */}
              <div>
                <label className="text-gray-500 text-xs font-mono block mb-1">
                  Resolution note <span className="text-gray-700">(optional — written to audit log)</span>
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Verified tampering via DB audit. Rolled back affected block. No patient data loss confirmed."
                  className="w-full rounded-lg px-3 py-2 text-xs font-sans focus:outline-none resize-none"
                  style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e5e7eb' }}
                />
              </div>

              <button
                onClick={applyStatus}
                disabled={!statusChoice || applying}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all disabled:opacity-50"
                style={{ background: '#052e16', color: '#86efac', border: '1px solid #14532d' }}
              >
                {applying
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  : <><Send    className="w-3.5 h-3.5" /> Apply Status Update</>}
              </button>

              {actionMsg && (
                <div
                  className="text-xs font-mono p-2.5 rounded-lg"
                  style={{
                    background:  actionMsg.startsWith('✓') ? '#052e16' : '#1a0000',
                    color:       actionMsg.startsWith('✓') ? '#86efac' : '#f87171',
                    border:      `1px solid ${actionMsg.startsWith('✓') ? '#14532d' : '#7f1d1d'}`,
                  }}
                >
                  {actionMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Admin Blockchain Issues Page ──────────────────────── */
export const AdminBlockchainIssues: React.FC<AdminBlockchainIssuesProps> = ({ onBack }) => {
  const [issues,     setIssues]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [selected,   setSelected]   = useState<any | null>(null);
  const [statusFilter, setFilter]   = useState<'all' | 'open' | 'investigating' | 'resolved'>('all');
  const [chainStats, setChainStats] = useState<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const [issuesRes, statsRes] = await Promise.all([
        fetch('/api/blockchain/issues', { headers: authHeader() }),
        fetch('/api/blockchain/stats',  { headers: authHeader() }),
      ]);
      if (issuesRes.ok) setIssues(await issuesRes.json());
      if (statsRes.ok)  setChainStats(await statsRes.json());
    } catch (err: any) {
      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const quickMark = async (id: string, status: string) => {
    await fetch(`/api/blockchain/issues/${id}/status`, {
      method:  'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    });
    load(true);
  };

  const filtered = issues.filter(i => statusFilter === 'all' || i.status === statusFilter);

  const counts = {
    total:         issues.length,
    open:          issues.filter(i => i.status === 'open').length,
    investigating: issues.filter(i => i.status === 'investigating').length,
    resolved:      issues.filter(i => i.status === 'resolved').length,
  };

  const statCards = [
    { label: 'Total Issues',  value: counts.total,         color: '#e5e7eb', bg: '#111827', border: '#1f2937' },
    { label: 'Open',          value: counts.open,          color: '#f87171', bg: '#1a0000', border: '#7f1d1d' },
    { label: 'Investigating', value: counts.investigating, color: '#fbbf24', bg: '#1c1408', border: '#92400e' },
    { label: 'Resolved',      value: counts.resolved,      color: '#86efac', bg: '#052e16', border: '#14532d' },
  ];

  return (
    <div
      className="min-h-full p-6"
      style={{ background: '#0a0f1a', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}
    >
      <button
        onClick={onBack}
        className="text-gray-600 hover:text-gray-300 text-xs mb-5 flex items-center gap-1 transition-colors"
      >
        ← back to dashboard
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}
          >
            <Link className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Blockchain Integrity Issues</h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {loading ? 'Loading…' : `${issues.length} reports · ${counts.open} open · reported by regulator`}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50 transition-all"
          style={{ background: '#111827', color: '#9ca3af', border: '1px solid #1f2937' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl flex items-start gap-2 border"
          style={{ background: '#1a0000', borderColor: '#7f1d1d' }}
        >
          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <span className="text-red-400 text-xs font-mono flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400" />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: s.bg, borderColor: s.border }}>
            <p className="text-gray-600 text-xs font-mono">{s.label}</p>
            {loading
              ? <div className="w-8 h-7 rounded mt-1 animate-pulse bg-gray-800" />
              : <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>}
          </div>
        ))}
      </div>

      {/* Chain Health Bar */}
      {chainStats && (
        <div
          className="mb-5 p-4 rounded-xl border flex flex-wrap gap-4 items-center"
          style={{ background: '#111827', borderColor: '#1f2937' }}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-gray-300 text-sm font-mono">{chainStats.totalBlocks} total blocks in DB</span>
          </div>
          {chainStats.byRole?.map((r: any) => (
            <div key={r.role} className="flex items-center gap-1.5 text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-500 capitalize">{r.role}: {r.count}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                chainStats.openIssues > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`}
            />
            <span
              className={`text-xs font-mono ${
                chainStats.openIssues > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {chainStats.openIssues > 0
                ? `${chainStats.openIssues} open issue(s) need attention`
                : 'No open issues'}
            </span>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {(['all', 'open', 'investigating', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all capitalize"
            style={{
              background:  statusFilter === f ? '#1e3a5f' : '#111827',
              color:       statusFilter === f ? '#60a5fa' : '#6b7280',
              border:      `1px solid ${statusFilter === f ? '#3b82f6' : '#1f2937'}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div
              key={i}
              className="rounded-xl p-4 border animate-pulse"
              style={{ background: '#111827', borderColor: '#1f2937' }}
            >
              <div className="flex gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-800 mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded bg-gray-800 w-1/3" />
                  <div className="h-2.5 rounded bg-gray-800 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ background: '#111827', borderColor: '#1f2937' }}
        >
          <Shield className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-600 text-sm font-mono">
            {issues.length === 0 ? 'No blockchain issues reported yet.' : 'No issues match the current filter.'}
          </p>
          <p className="text-gray-700 text-xs mt-1 font-mono">
            Regulators report issues from the Blockchain Integrity page.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(issue => {
            const st     = STATUS[issue.status as keyof typeof STATUS] ?? STATUS.open;
            const isOpen = issue.status === 'open';

            return (
              <div
                key={issue.id}
                className="rounded-xl border overflow-hidden transition-all hover:brightness-110"
                style={{ background: '#1a0000', borderColor: isOpen ? '#991b1b' : '#21262d' }}
              >
                {/* Row */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer group"
                  onClick={() => setSelected(issue)}
                >
                  <div className="mt-1 relative shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    {isOpen && (
                      <div className="absolute inset-0 rounded-full animate-ping opacity-40 bg-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold text-red-400">DATA BREACH · BLOCKCHAIN</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-mono"
                        style={{ background: `${st.pill}22`, color: st.text, border: `1px solid ${st.border}` }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-snug mb-1.5 font-sans">{issue.alert_message}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600 font-mono flex-wrap">
                      <span><User  className="w-3 h-3 inline mr-1" />{issue.user_role} reported</span>
                      <span><Clock className="w-3 h-3 inline mr-1" />{timeAgo(issue.created_at)}</span>
                      <span className="text-gray-700">{new Date(issue.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                    <span className="text-gray-600 text-xs font-mono">Investigate</span>
                    <Terminal className="w-4 h-4 text-gray-600" />
                  </div>
                </div>

                {/* Quick Action Bar (open/investigating only) */}
                {issue.status !== 'resolved' && (
                  <div
                    className="border-t flex"
                    style={{ borderColor: '#7f1d1d66' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelected(issue)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono hover:bg-white/5 transition-colors"
                      style={{ color: '#60a5fa', borderRight: '1px solid #7f1d1d66' }}
                    >
                      <Terminal className="w-3 h-3" />
                      {issue.status === 'open' ? 'Investigate & Act' : 'Continue Investigation'}
                    </button>
                    <button
                      onClick={() => quickMark(issue.id, 'investigating')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono hover:bg-white/5 transition-colors"
                      style={{ color: '#fbbf24', borderRight: '1px solid #7f1d1d66' }}
                    >
                      <Clock className="w-3 h-3" /> Investigating
                    </button>
                    <button
                      onClick={() => quickMark(issue.id, 'resolved')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono hover:bg-white/5 transition-colors"
                      style={{ color: '#86efac' }}
                    >
                      <CheckCircle className="w-3 h-3" /> Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Panel */}
      {selected && (
        <IssueActionPanel
          issue={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(true); setSelected(null); }}
        />
      )}
    </div>
  );
};