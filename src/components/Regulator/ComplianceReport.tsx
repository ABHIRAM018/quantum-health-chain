import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale, Shield, CheckCircle, XCircle, RefreshCw, Download,
  AlertTriangle, ChevronDown, ChevronUp, Send, Activity,
  Database, Zap, AlertOctagon, FileText
} from 'lucide-react';
import { Regulator } from '../../types';

interface ComplianceReportProps    { user: Regulator; onBack: () => void; }
interface BlockchainIntegrityProps { user: Regulator; onBack: () => void; }

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ─────────────────────────── Compliance Report ─────────────────────────── */
export const ComplianceReport: React.FC<ComplianceReportProps> = ({ user, onBack }) => {
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/regulator/stats', { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = stats ?? {
    claimApprovalRate: '0', totalClaims: 0, approvedClaims: 0, rejectedClaims: 0,
    totalBills: 0, totalPayments: 0, completedPayments: 0, activeConsents: 0,
    totalUsers: 0, blockchainLength: 0, openAlerts: 0, criticalAlerts: 0,
  };

  const consentRate = s.totalUsers > 0
    ? ((s.activeConsents / s.totalUsers) * 100).toFixed(1)
    : '0';

  const checks = [
    { label: 'All bills have linked patient IDs',    pass: s.totalBills > 0 },
    { label: 'Insurance claims are being processed', pass: s.totalClaims > 0 },
    { label: 'Payments reference approved claims',   pass: s.completedPayments > 0 },
    { label: 'No open critical security alerts',     pass: s.criticalAlerts === 0 },
    { label: 'Blockchain records are present',       pass: s.blockchainLength > 0 },
    { label: 'Active patient consents on file',      pass: s.activeConsents > 0 },
    { label: 'Claim approval rate ≥ 50%',            pass: parseFloat(s.claimApprovalRate) >= 50 },
  ];

  const passCount      = checks.filter(c => c.pass).length;
  const fullyCompliant = checks.every(c => c.pass);

  const exportReport = () => {
    const lines = [
      'COMPLIANCE REPORT — QUANTUM HEALTH CHAIN',
      `Authority  : ${user.organization}`,
      `Officer    : ${user.name}`,
      `Jurisdiction: ${user.jurisdiction}`,
      `Date       : ${new Date().toLocaleString()}`,
      '',
      `CHECKS (${passCount}/${checks.length} PASSED)`,
      ...checks.map(c => `${c.pass ? '✓ PASS' : '✗ FAIL'} — ${c.label}`),
      '',
      'KEY METRICS',
      `Claim Approval Rate : ${s.claimApprovalRate}%`,
      `Consent Rate        : ${consentRate}%`,
      `Total Users         : ${s.totalUsers}`,
      `Total Bills         : ${s.totalBills}`,
      `Total Claims        : ${s.totalClaims}`,
      `Blockchain Records  : ${s.blockchainLength}`,
      `Open Security Alerts: ${s.openAlerts}`,
      '',
      `VERDICT: ${fullyCompliant ? 'FULLY COMPLIANT' : 'PARTIAL COMPLIANCE'}`,
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `compliance-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const metricCards = [
    { label: 'Claim Approval', value: `${s.claimApprovalRate}%`, ok: parseFloat(s.claimApprovalRate) >= 50 },
    { label: 'Consent Rate',   value: `${consentRate}%`,         ok: parseFloat(consentRate) > 0 },
    { label: 'Open Alerts',    value: String(s.openAlerts),      ok: s.openAlerts === 0 },
    { label: 'Blockchain',     value: `${s.blockchainLength} recs`, ok: s.blockchainLength > 0 },
  ];

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors">
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Compliance Report</h1>
            <p className="text-gray-500 text-sm">{user.jurisdiction} · Live PostgreSQL data</p>
          </div>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metricCards.map(m => (
          <div
            key={m.label}
            className={`border rounded-xl p-4 ${m.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              {m.ok
                ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                : <XCircle     className="w-3.5 h-3.5 text-red-600" />}
              <span className={`text-xs font-medium ${m.ok ? 'text-green-600' : 'text-red-600'}`}>
                {m.ok ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </span>
            </div>
            <p className={`text-2xl font-bold ${m.ok ? 'text-green-800' : 'text-red-800'}`}>{m.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Compliance Checks */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-gray-900 font-semibold text-sm mb-4">Automated Compliance Checks</h3>
        <div className="space-y-2">
          {checks.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                c.pass ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
              }`}
            >
              {c.pass
                ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                : <XCircle     className="w-4 h-4 text-red-600 shrink-0" />}
              <span className="text-sm text-gray-700 flex-1">{c.label}</span>
              <span className={`text-xs font-bold ${c.pass ? 'text-green-600' : 'text-red-600'}`}>
                {c.pass ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-gray-500 text-sm">
            Overall: <strong className="text-gray-900">{passCount}/{checks.length}</strong> checks passed
          </span>
          <span className={`text-sm font-bold ${fullyCompliant ? 'text-green-600' : 'text-amber-600'}`}>
            {fullyCompliant ? '✓ FULLY COMPLIANT' : '⚠ PARTIAL COMPLIANCE'}
          </span>
        </div>
      </div>

      {/* Raw Metrics */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-gray-900 font-semibold text-sm mb-4">Raw System Metrics (Live)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Users',        value: s.totalUsers },
            { label: 'Total Bills',        value: s.totalBills },
            { label: 'Total Claims',       value: s.totalClaims },
            { label: 'Approved Claims',    value: s.approvedClaims },
            { label: 'Rejected Claims',    value: s.rejectedClaims },
            { label: 'Total Payments',     value: s.totalPayments },
            { label: 'Completed Payments', value: s.completedPayments },
            { label: 'Active Consents',    value: s.activeConsents },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xl font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Block Row (expandable) ──────────────────────── */
interface BlockRowProps {
  block:      any;
  index:      number;
  isBroken:   boolean;
  brokenInfo?: any;
}

const BlockRow: React.FC<BlockRowProps> = ({ block, index, isBroken, brokenInfo }) => {
  const [expanded, setExpanded] = useState(false);

  const roleColor: Record<string, string> = {
    doctor:    'bg-blue-100 text-blue-700',
    hospital:  'bg-green-100 text-green-700',
    insurance: 'bg-purple-100 text-purple-700',
    admin:     'bg-red-100 text-red-700',
    patient:   'bg-orange-100 text-orange-700',
    bank:      'bg-yellow-100 text-yellow-700',
  };

  const dataRows: [string, string][] = [
    ['Record ID',  block.record_id   || block.recordId    || '—'],
    ['User ID',    block.user_id     || block.userId      || '—'],
    ['Role',       block.role        || '—'],
    ['Full Hash',  block.hash        || '—'],
    ['Prev Hash',  block.previous_hash || block.previousHash || '—'],
    ['Timestamp',  block.timestamp   ? new Date(block.timestamp).toISOString() : '—'],
    ['Created At', (block.created_at || block.createdAt)
                    ? new Date(block.created_at || block.createdAt).toISOString() : '—'],
  ];

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isBroken ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Row Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-black/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
            isBroken ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          #{index}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {isBroken && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
                ⚠ TAMPERED
              </span>
            )}
            <span className="text-gray-900 text-xs font-mono font-medium">
              {(block.hash || '').slice(0, 24)}…{(block.hash || '').slice(-8)}
            </span>
          </div>
          <p className="text-gray-400 text-xs font-mono">
            Prev: {(block.previous_hash || block.previousHash || '').slice(0, 20)}…
          </p>
          {isBroken && brokenInfo && (
            <p className="text-red-600 text-xs mt-0.5">
              Expected prev: {brokenInfo.expectedPrevHash?.slice(0, 20)}… — MISMATCH
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleColor[block.role] ?? 'bg-gray-100 text-gray-600'}`}>
            {block.role}
          </span>
          <p className="text-gray-400 text-xs mt-0.5">
            {block.timestamp ? new Date(block.timestamp).toLocaleString() : '—'}
          </p>
        </div>

        <div className="shrink-0 ml-1">
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 space-y-2 text-xs font-mono">
          {dataRows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2">
              <span className="text-gray-500 truncate">{k}</span>
              <span
                className={`col-span-2 break-all ${
                  k === 'Full Hash' || k === 'Prev Hash' ? 'text-indigo-700' : 'text-gray-800'
                }`}
              >
                {v}
              </span>
            </div>
          ))}

          {isBroken && brokenInfo && (
            <div className="mt-2 p-2 rounded bg-red-100 border border-red-200 text-red-700 text-xs">
              ⚠ This block's previous_hash does not match block #{index - 1}'s hash.
              This block or a prior block may have been modified after insertion.
            </div>
          )}

          {block.data && (
            <div className="mt-1">
              <span className="text-gray-500">Data payload: </span>
              <span className="text-gray-700 break-all">
                {(typeof block.data === 'string'
                  ? block.data
                  : JSON.stringify(block.data)
                ).slice(0, 200)}
                {(typeof block.data === 'string' ? block.data : JSON.stringify(block.data)).length > 200 ? '…' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────── Blockchain Integrity Verifier ─────────────────── */
export const BlockchainIntegrity: React.FC<BlockchainIntegrityProps> = ({ user, onBack }) => {
  const [chain,        setChain]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [verifying,    setVerifying]    = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [serverResult, setServerResult] = useState<any>(null);
  const [chainStats,   setChainStats]   = useState<any>(null);
  const [reporting,    setReporting]    = useState(false);
  const [reportSent,   setReportSent]   = useState(false);
  const [reportError,  setReportError]  = useState<string | null>(null);
  const [showAll,      setShowAll]      = useState(false);
  const [filterMode,   setFilterMode]   = useState<'all' | 'broken'>('all');
  const [search,       setSearch]       = useState('');

  /* Load chain + stats */
  const loadChain = useCallback(async () => {
    setLoading(true);
    try {
      const [chainRes, statsRes] = await Promise.all([
        fetch('/api/blockchain',       { headers: authHeader() }),
        fetch('/api/blockchain/stats', { headers: authHeader() }),
      ]);
      if (chainRes.ok)  setChain(await chainRes.json());
      if (statsRes.ok)  setChainStats(await statsRes.json());
    } catch {
      setChain([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Client-side hash-linkage check */
  const verifyClientSide = useCallback((blocks: any[]) => {
    if (blocks.length === 0) return { valid: true, brokenBlocks: [], totalBlocks: 0 };
    const brokenBlocks: any[] = [];
    for (let i = 1; i < blocks.length; i++) {
      const cur  = blocks[i];
      const prev = blocks[i - 1];
      const curPrev = cur.previous_hash ?? cur.previousHash ?? '';
      if (curPrev !== prev.hash) {
        brokenBlocks.push({
          blockIndex:       i,
          recordId:         cur.record_id ?? cur.recordId,
          role:             cur.role,
          expectedPrevHash: prev.hash,
          actualPrevHash:   curPrev,
          currentHash:      cur.hash,
          timestamp:        cur.timestamp,
        });
      }
    }
    return { valid: brokenBlocks.length === 0, brokenBlocks, totalBlocks: blocks.length };
  }, []);

  /* Server-side deep verify */
  const verifyServerSide = async () => {
    setVerifying(true);
    setServerResult(null);
    try {
      const res  = await fetch('/api/blockchain/verify-full', {
        method:  'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setServerResult(data);
      setVerifyResult(data);
    } catch (err: any) {
      setServerResult({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  /* Report broken chain to admin */
  const reportToAdmin = async () => {
    const result = verifyResult ?? verifyClientSide(chain);
    if (result.valid) return;
    setReporting(true);
    setReportError(null);
    try {
      const firstBroken = result.brokenBlocks?.[0];
      const res = await fetch('/api/blockchain/report-issue', {
        method:  'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokenAt:     firstBroken?.blockIndex ?? 0,
          affectedCount: result.brokenBlocks?.length ?? 1,
          totalBlocks:  result.totalBlocks ?? chain.length,
          severity:     'critical',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed');
      setReportSent(true);
    } catch (err: any) {
      setReportError(err.message);
    } finally {
      setReporting(false);
    }
  };

  useEffect(() => { loadChain(); }, [loadChain]);

  /* Auto-run client verify whenever chain loads */
  useEffect(() => {
    if (!loading) setVerifyResult(verifyClientSide(chain));
  }, [loading, chain, verifyClientSide]);

  const result    = verifyResult;
  const broken    = (result?.brokenBlocks ?? []) as any[];
  const isHealthy = result?.valid === true;

  /* Broken-block index map for O(1) lookup */
  const brokenMap: Record<number, any> = {};
  broken.forEach(b => { brokenMap[b.blockIndex] = b; });

  /* Filter + search */
  const filteredChain = chain.filter((block, i) => {
    if (filterMode === 'broken' && !brokenMap[i]) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (block.hash        || '').toLowerCase().includes(q) ||
        (block.role        || '').toLowerCase().includes(q) ||
        (block.record_id   || '').toLowerCase().includes(q) ||
        (block.user_id     || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const visibleChain = showAll ? filteredChain : filteredChain.slice(0, 20);

  /* Stat cards for the page header */
  const statCards = [
    {
      label: 'Total Blocks',
      value: chainStats?.totalBlocks ?? chain.length,
      icon:  Database,
      ok:    true,
    },
    {
      label: 'Open Issues',
      value: chainStats?.openIssues ?? 0,
      icon:  AlertOctagon,
      ok:    (chainStats?.openIssues ?? 0) === 0,
    },
    {
      label: 'Broken Blocks',
      value: broken.length,
      icon:  XCircle,
      ok:    broken.length === 0,
    },
    {
      label: 'Chain Status',
      value: isHealthy ? 'INTACT' : 'BROKEN',
      icon:  isHealthy ? CheckCircle : AlertTriangle,
      ok:    isHealthy,
    },
  ];

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm mb-4 transition-colors flex items-center gap-1">
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Blockchain Integrity</h1>
            <p className="text-gray-500 text-sm">
              {loading ? 'Loading…' : `${chain.length} records · SHA-256 · Verified by: ${user.name}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadChain}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
          <button
            onClick={verifyServerSide}
            disabled={verifying || loading}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying…' : 'Deep Verify (Server)'}
          </button>
        </div>
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {statCards.map(s => (
          <div
            key={s.label}
            className={`border rounded-xl p-4 flex items-center gap-3 ${
              s.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <s.icon className={`w-5 h-5 shrink-0 ${s.ok ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className={`text-xl font-bold ${s.ok ? 'text-green-800' : 'text-red-800'}`}>{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Result Banner */}
      {loading ? (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <RefreshCw className="w-5 h-5 text-teal-600 animate-spin" />
          <span className="text-gray-600 text-sm">Loading blockchain records from PostgreSQL…</span>
        </div>
      ) : result && (
        <div className={`border rounded-xl p-4 mb-5 ${isHealthy ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-start gap-3 flex-wrap">
            {/* Status text */}
            <div className="flex items-start gap-3 flex-1">
              {isHealthy
                ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                : <XCircle     className="w-5 h-5 text-red-600   shrink-0 mt-0.5" />}
              <div>
                <p className={`font-bold text-sm ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
                  {isHealthy
                    ? `✓ Chain intact — all ${chain.length} blocks verified`
                    : `✗ Chain broken — ${broken.length} tampered block${broken.length !== 1 ? 's' : ''} detected`}
                </p>
                <p className={`text-xs mt-1 ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                  {isHealthy
                    ? 'All blocks have valid SHA-256 hashes and correct previous-hash linkage. No tampering detected.'
                    : `Blocks ${broken.map((b: any) => `#${b.blockIndex}`).join(', ')} have mismatched previous-hash fields. Records may have been tampered with after insertion.`}
                </p>
                {serverResult && !serverResult.error && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Server-verified at {new Date(serverResult.verifiedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Report to Admin */}
            {!isHealthy && !reportSent && (
              <button
                onClick={reportToAdmin}
                disabled={reporting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
              >
                {reporting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Reporting…</>
                  : <><Send className="w-4 h-4" /> Report to Admin</>}
              </button>
            )}
            {reportSent && (
              <div className="flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2 rounded-lg text-sm shrink-0">
                <CheckCircle className="w-4 h-4" /> Alert sent · Admin notified
              </div>
            )}
          </div>
          {reportError && (
            <p className="text-red-600 text-xs mt-2 ml-8">Report failed: {reportError}</p>
          )}
        </div>
      )}

      {/* Broken Block Deep Analysis */}
      {broken.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <h3 className="text-red-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" /> Tampered Block Analysis
          </h3>
          <div className="space-y-3">
            {broken.map((b: any) => (
              <div key={b.blockIndex} className="bg-white border border-red-200 rounded-lg p-3 text-xs font-mono space-y-1.5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Block #{b.blockIndex}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-600 capitalize">{b.role}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-500">{b.timestamp ? new Date(b.timestamp).toLocaleString() : '—'}</span>
                </div>
                <div><span className="text-gray-500">Record ID:     </span><span className="text-gray-800 break-all">{b.recordId}</span></div>
                <div><span className="text-gray-500">Current Hash:  </span><span className="text-indigo-700 break-all">{b.currentHash}</span></div>
                <div><span className="text-gray-500">Expected Prev: </span><span className="text-green-700 break-all">{b.expectedPrevHash}</span></div>
                <div><span className="text-gray-500">Actual Prev:   </span><span className="text-red-600 break-all">{b.actualPrevHash}</span></div>
                <div className="bg-red-50 border border-red-100 rounded p-2 text-red-700 mt-1">
                  ⚠ previous_hash mismatch — block #{b.blockIndex - 1}'s hash was not carried forward correctly.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Breakdown */}
      {chainStats?.byRole?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {chainStats.byRole.map((r: any) => (
            <div key={r.role} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-gray-900 font-bold text-sm">{r.count}</p>
                <p className="text-gray-500 text-xs capitalize">{r.role} blocks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chain Explorer */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-gray-900 font-semibold text-sm flex-1">Chain Explorer</h3>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by hash, role, record ID…"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 w-56"
        />
        <select
          value={filterMode}
          onChange={e => setFilterMode(e.target.value as 'all' | 'broken')}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none"
        >
          <option value="all">All blocks</option>
          <option value="broken">Broken only</option>
        </select>
      </div>

      {chain.length === 0 && !loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No blockchain records yet.</p>
          <p className="text-gray-400 text-xs mt-1">
            Records are created when medical records, bills, claims, and payments are saved.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-500 text-xs mb-2">
            Showing {visibleChain.length} of {filteredChain.length} blocks
            {filteredChain.length !== chain.length && ` (filtered from ${chain.length})`}
          </p>
          {visibleChain.map(block => {
            const realIndex = chain.indexOf(block);
            return (
              <BlockRow
                key={block.id ?? realIndex}
                block={block}
                index={realIndex}
                isBroken={!!brokenMap[realIndex]}
                brokenInfo={brokenMap[realIndex]}
              />
            );
          })}
          {filteredChain.length > 20 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2.5 text-sm text-teal-600 hover:text-teal-700 border border-dashed border-teal-300 rounded-xl hover:bg-teal-50 transition-colors"
            >
              Show all {filteredChain.length} blocks
            </button>
          )}
        </div>
      )}
    </div>
  );
};