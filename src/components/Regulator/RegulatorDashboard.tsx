import React, { useState, useEffect } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { AuditTrail } from '../Regulator/AuditTrail';
import { ComplianceReport, BlockchainIntegrity } from '../Regulator/ComplianceReport';
import { Regulator } from '../../types';
import { LayoutDashboard, FileText, Scale, Shield, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';

interface RegulatorPortalProps { user: Regulator; onLogout: () => void; }

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const RegulatorPortal: React.FC<RegulatorPortalProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  React.useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent).detail?.page;
      if (page) setCurrentPage(page);
    };
    window.addEventListener('qhc:navigate', handler);
    return () => window.removeEventListener('qhc:navigate', handler);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':  return <RegulatorDashboardContent user={user} onPageChange={setCurrentPage} />;
      case 'audit':      return <AuditTrail user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'compliance': return <ComplianceReport user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'blockchain': return <BlockchainIntegrity user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'alerts':     return <RegulatorAlerts user={user} onBack={() => setCurrentPage('dashboard')} />;
      default:           return <RegulatorDashboardContent user={user} onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="regulator" currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user as any} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
};

// ── Read-only Security Alerts for Regulator ───────────────────────────────
const severityConfig: Record<string, any> = {
  low:      { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600',   dot: 'bg-blue-400'   },
  medium:   { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-600',  dot: 'bg-amber-400'  },
  high:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', dot: 'bg-orange-400' },
  critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-600',    dot: 'bg-red-400'    },
};

const RegulatorAlerts: React.FC<{ user: Regulator; onBack: () => void }> = ({ onBack }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/security-alerts', { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAlerts(data.map((r: any) => ({
        id:           r.id,
        alertType:    r.alert_type    ?? r.alertType,
        alertMessage: r.alert_message ?? r.alertMessage ?? '',
        severity:     r.severity,
        status:       r.status,
        userId:       r.user_id       ?? r.userId,
        createdAt:    new Date(r.created_at ?? r.createdAt),
      }))))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const open     = alerts.filter(a => a.status === 'open').length;
  const critical = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 transition-colors">← Back</button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Security Alerts <span className="text-sm font-normal text-gray-500 ml-2">(Read-Only)</span></h1>
          <p className="text-gray-500 text-sm">{open} open · {critical} critical · {alerts.length} total</p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-5 flex items-center gap-2">
        <Eye className="w-4 h-4 shrink-0" />
        You have read-only access. Contact the System Administrator to resolve alerts.
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No security alerts found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(a => {
            const sc = severityConfig[a.severity] ?? severityConfig.low;
            return (
              <div key={a.id} className={`flex items-start gap-4 p-4 rounded-xl border ${sc.bg} ${sc.border}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} shrink-0 mt-1 ${a.status === 'open' ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold uppercase ${sc.text}`}>{a.severity}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-gray-700 text-xs font-medium capitalize">{(a.alertType ?? '').replace(/_/g,' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      a.status === 'open' ? 'bg-red-50 text-red-600 border-red-200' :
                      a.status === 'resolved' ? 'bg-green-50 text-green-600 border-green-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'}`}>{a.status}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5 truncate">{a.alertMessage}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Regulator Dashboard Content ───────────────────────────────────────────
interface RegulatorDashboardContentProps { user: Regulator; onPageChange: (p: string) => void; }

const RegulatorDashboardContent: React.FC<RegulatorDashboardContentProps> = ({ user, onPageChange }) => {
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/regulator/stats', { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  // Show warning if stats couldn't be loaded (server may need restart)
  const statsError = !loading && stats === null;

  const statCards = [
    { label: 'Audit Logs',   value: loading ? '...' : (stats?.totalLogs ?? 0).toLocaleString(),  icon: FileText,    color: 'text-blue-600',   bg: 'bg-blue-50',   page: 'audit'      },
    { label: 'Compliance',   value: loading ? '...' : `${stats?.claimApprovalRate ?? 0}%`,         icon: Scale,       color: 'text-green-600',  bg: 'bg-green-50',  page: 'compliance' },
    { label: 'Blockchain',   value: loading ? '...' : `${stats?.blockchainLength ?? 0} records`,   icon: Shield,      color: 'text-purple-600', bg: 'bg-purple-50', page: 'blockchain' },
    { label: 'Open Alerts',  value: loading ? '...' : (stats?.openAlerts ?? 0).toString(),         icon: AlertCircle, color: 'text-red-600',    bg: 'bg-red-50',    page: 'alerts'     },
  ];

  const checks = [
    { label: 'Total bills in system',         value: stats?.totalBills       ?? 0, ok: (stats?.totalBills ?? 0) >= 0 },
    { label: 'Insurance claims processed',    value: stats?.totalClaims      ?? 0, ok: true },
    { label: 'Claim approval rate',           value: `${stats?.claimApprovalRate ?? 0}%`, ok: parseFloat(stats?.claimApprovalRate ?? '0') >= 0 },
    { label: 'Blockchain records logged',     value: stats?.blockchainLength ?? 0, ok: (stats?.blockchainLength ?? 0) > 0 },
    { label: 'Active patient consents',       value: stats?.activeConsents   ?? 0, ok: true },
    { label: 'Open security alerts',          value: stats?.openAlerts       ?? 0, ok: (stats?.openAlerts ?? 0) === 0 },
    { label: 'Critical security alerts',      value: stats?.criticalAlerts   ?? 0, ok: (stats?.criticalAlerts ?? 0) === 0 },
    { label: 'Completed payments',            value: stats?.completedPayments ?? 0, ok: true },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regulator Dashboard</h1>
          <p className="text-gray-500 text-sm">{user.organization} · {user.jurisdiction}</p>
        </div>
      </div>

      {statsError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
          ⚠ Could not load live stats. Please restart the server (<code>node server.js</code>) and refresh.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <button key={s.label} onClick={() => onPageChange(s.page)}
            className="bg-white border border-gray-200 p-5 rounded-xl hover:border-indigo-300 transition-all text-left group">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live compliance checks */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Live System Compliance</h2>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {checks.map((c, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${c.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  {c.ok
                    ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    : <XCircle    className="w-4 h-4 text-red-600   shrink-0" />}
                  <span className="text-gray-700 text-sm flex-1">{c.label}</span>
                  <span className={`text-sm font-bold ${c.ok ? 'text-green-600' : 'text-red-600'}`}>{c.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { page: 'audit',      icon: FileText,    label: 'Review Audit Trail',          desc: `${stats?.totalLogs ?? 0} log entries`,          color: 'text-blue-600'   },
              { page: 'compliance', icon: Scale,       label: 'Compliance Report',           desc: `${stats?.claimApprovalRate ?? 0}% approval rate`, color: 'text-green-600'  },
              { page: 'blockchain', icon: Shield,      label: 'Verify Blockchain Integrity', desc: `${stats?.blockchainLength ?? 0} records`,         color: 'text-purple-600' },
              { page: 'alerts',     icon: AlertCircle, label: 'Security Alerts',             desc: `${stats?.openAlerts ?? 0} open`,                  color: 'text-red-600'    },
            ].map(a => (
              <button key={a.page} onClick={() => onPageChange(a.page)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <a.icon className={`w-5 h-5 ${a.color}`} />
                  <div className="text-left">
                    <p className="text-gray-900 font-medium text-sm">{a.label}</p>
                    <p className="text-gray-500 text-xs">{a.desc}</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};