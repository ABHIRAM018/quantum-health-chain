import React, { useState, useEffect } from 'react';
import {
 BarChart3, Download, Users,
 DollarSign, Shield, CheckCircle,
 AlertTriangle, Stethoscope, RefreshCw, Loader
} from 'lucide-react';
import { Admin } from '../../types';

interface AdminReportsProps {
 user: Admin;
 onBack: () => void;
}

const authHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

const Bar: React.FC<{ value: number; max: number; color: string; label: string; sub?: string }> = ({ value, max, color, label, sub }) => (
 <div className="flex items-center gap-3">
 <div className="w-24 text-right text-gray-500 text-xs shrink-0">{label}</div>
 <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
 <div
 className={`h-full ${color} rounded-lg transition-all duration-700 flex items-center justify-end pr-2`}
 style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
 >
 <span className="text-gray-900 text-xs font-bold">{value}</span>
 </div>
 </div>
 {sub && <div className="text-gray-500 text-xs w-20 shrink-0">{sub}</div>}
 </div>
);

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
 const max = Math.max(...data);
 const min = Math.min(...data);
 const range = max - min || 1;
 const w = 120, h = 36, pad = 4;
 const pts = data.map((v, i) => {
 const x = pad + (i / (data.length - 1)) * (w - pad * 2);
 const y = h - pad - ((v - min) / range) * (h - pad * 2);
 return `${x},${y}`;
 }).join(' ');
 return (
 <svg width={w} height={h} className="overflow-visible">
 <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 {data.map((v, i) => {
 const x = pad + (i / (data.length - 1)) * (w - pad * 2);
 const y = h - pad - ((v - min) / range) * (h - pad * 2);
 return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
 })}
 </svg>
 );
};

export const AdminReports: React.FC<AdminReportsProps> = ({ user, onBack }) => {
 const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'financial' | 'security' | 'clinical'>('overview');
 const [exporting, setExporting] = useState(false);

 // ── Load all stats from PostgreSQL ──────────────────────
 const [dbStats, setDbStats] = useState<any>(null);
 const [loadingStats, setLoadingStats] = useState(true);

 useEffect(() => {
   const load = async () => {
     try {
       const [usersRes, apptRes, billsRes, claimsRes, paymentsRes,
              logsRes, alertsRes, rxRes, loansRes, consentsRes] = await Promise.all([
         fetch('/api/users',                       { headers: authHeader() }),
         fetch('/api/appointments',                { headers: authHeader() }),
         fetch('/api/bills',                       { headers: authHeader() }),
         fetch('/api/claims',                      { headers: authHeader() }),
         fetch('/api/payments',                    { headers: authHeader() }),
         fetch('/api/logs',                        { headers: authHeader() }),
         fetch('/api/security-alerts',             { headers: authHeader() }),
         fetch('/api/prescriptions',               { headers: authHeader() }),
         fetch('/api/loans',                       { headers: authHeader() }),
         fetch('/api/consents',                    { headers: authHeader() }),
       ]);
       const [allUsers, appts, bills, claims, pmts, logs, alerts, rx, loans, consents] =
         await Promise.all([
           usersRes.ok  ? usersRes.json()   : [],
           apptRes.ok   ? apptRes.json()    : [],
           billsRes.ok  ? billsRes.json()   : [],
           claimsRes.ok ? claimsRes.json()  : [],
           paymentsRes.ok ? paymentsRes.json() : [],
           logsRes.ok   ? logsRes.json()    : [],
           alertsRes.ok ? alertsRes.json()  : [],
           rxRes.ok     ? rxRes.json()      : [],
           loansRes.ok  ? loansRes.json()   : [],
           consentsRes.ok ? consentsRes.json() : [],
         ]);

       setDbStats({
         totalUsers:            allUsers.length,
         patients:              allUsers.filter((u:any) => u.role==='patient').length,
         doctors:               allUsers.filter((u:any) => u.role==='doctor').length,
         hospitals:             allUsers.filter((u:any) => u.role==='hospital').length,
         insurance:             allUsers.filter((u:any) => u.role==='insurance').length,
         banks:                 allUsers.filter((u:any) => u.role==='bank').length,
         totalAppointments:     appts.length,
         completedAppointments: appts.filter((a:any) => a.status==='completed').length,
         pendingAppointments:   appts.filter((a:any) => a.status==='pending').length,
         totalBills:            bills.length,
         totalRevenue:          bills.reduce((s:number,b:any) => s + parseFloat(b.amount||0), 0),
         totalClaims:           claims.length,
         approvedClaims:        claims.filter((c:any) => c.status==='approved').length,
         rejectedClaims:        claims.filter((c:any) => c.status==='rejected').length,
         totalPayments:         pmts.length,
         completedPayments:     pmts.filter((p:any) => p.status==='completed').length,
         paymentValue:          pmts.filter((p:any) => p.status==='completed').reduce((s:number,p:any) => s+parseFloat(p.amount||0), 0),
         totalLogs:             logs.length,
         openAlerts:            alerts.filter((a:any) => a.status==='open').length,
         criticalAlerts:        alerts.filter((a:any) => a.severity==='critical').length,
         prescriptions:         rx.length,
         activePrescriptions:   rx.filter((p:any) => p.status==='active').length,
         totalLoans:            loans.length,
         activeLoans:           loans.filter((l:any) => l.status==='repaying').length,
         activeConsents:        consents.filter((c:any) => c.status==='active').length,
         recentLogs:            logs.slice(0, 15),
         allUsers:              allUsers,
       });
     } catch(e) { console.error('Reports load error:', e); }
     finally { setLoadingStats(false); }
   };
   load();
 }, []);

 const stats = dbStats ?? {
   totalUsers:0,patients:0,doctors:0,hospitals:0,insurance:0,banks:0,
   totalAppointments:0,completedAppointments:0,pendingAppointments:0,
   totalBills:0,totalRevenue:0,totalClaims:0,approvedClaims:0,rejectedClaims:0,
   totalPayments:0,completedPayments:0,paymentValue:0,totalLogs:0,
   openAlerts:0,criticalAlerts:0,prescriptions:0,activePrescriptions:0,
   totalLoans:0,activeLoans:0,activeConsents:0,
 };

 const approvalRate = stats.totalClaims > 0
   ? ((stats.approvedClaims / stats.totalClaims) * 100).toFixed(1) : '0';
 const appointmentCompletionRate = stats.totalAppointments > 0
   ? ((stats.completedAppointments / stats.totalAppointments) * 100).toFixed(1) : '0';

 const monthlyData = [42, 58, 51, 73, 67, 89];
 const claimTrend  = [28, 35, 31, 48, 42, 52];
 const revenueTrend= [12400,15800,13200,18900,16700,21300];

 if (loadingStats) return (
   <div className="flex items-center justify-center h-64">
     <Loader className="w-6 h-6 animate-spin text-red-500" />
   </div>
 );

 const exportReport = async () => {
 setExporting(true);
 await new Promise(r => setTimeout(r, 800));
 const report = `QUANTUM HEALTH CHAIN — SYSTEM ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Generated By: ${user.name} (Admin)
================================================================

SYSTEM OVERVIEW
---------------
Total Users: ${stats.totalUsers}
 → Patients: ${stats.patients}
 → Doctors: ${stats.doctors}
 → Hospitals: ${stats.hospitals}
 → Insurance Companies: ${stats.insurance}
 → Banks: ${stats.banks}

APPOINTMENTS
------------
Total: ${stats.totalAppointments}
Completed: ${stats.completedAppointments} (${appointmentCompletionRate}%)
Pending: ${stats.pendingAppointments}

BILLING & PAYMENTS
------------------
Total Bills: ${stats.totalBills}
Total Revenue: $${stats.totalRevenue.toLocaleString()}
Payments Completed: ${stats.completedPayments}
Payment Value: $${stats.paymentValue.toLocaleString()}

INSURANCE CLAIMS
----------------
Total Claims: ${stats.totalClaims}
Approved: ${stats.approvedClaims} (${approvalRate}%)
Rejected: ${stats.rejectedClaims}

CLINICAL
--------
Prescriptions Issued: ${stats.prescriptions}
Active Prescriptions: ${stats.activePrescriptions}
Active Consents: ${stats.activeConsents}

FINANCIAL SERVICES
------------------
Medical Loans: ${stats.totalLoans}
Active Repaying: ${stats.activeLoans}

SECURITY
--------
Open Alerts: ${stats.openAlerts}
Critical Alerts: ${stats.criticalAlerts}
System Log Entries: ${stats.totalLogs}
================================================================
`;
 const blob = new Blob([report], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `qhc-admin-report-${new Date().toISOString().split('T')[0]}.txt`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 setExporting(false);
 };

 const tabs = [
 { id: 'overview', label: 'Overview', icon: BarChart3 },
 { id: 'users', label: 'Users', icon: Users },
 { id: 'financial', label: 'Financial', icon: DollarSign },
 { id: 'security', label: 'Security', icon: Shield },
 { id: 'clinical', label: 'Clinical', icon: Stethoscope },
 ] as const;

 return (
 <div className="min-h-full bg-gray-50 p-6">
 <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 transition-colors">← Back</button>

 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
 <BarChart3 className="w-5 h-5 text-gray-900" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-gray-900">System Reports & Analytics</h1>
 <p className="text-gray-500 text-sm">Live data across all portals — {new Date().toLocaleDateString()}</p>
 </div>
 </div>
 <button onClick={exportReport} disabled={exporting}
 className="flex items-center gap-2 bg-gray-100 hover:bg-gray-700 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
 {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
 {exporting ? 'Exporting…' : 'Export Report'}
 </button>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1">
 {tabs.map(t => (
 <button key={t.id} onClick={() => setActiveTab(t.id)}
 className={`flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
 activeTab === t.id ? 'bg-red-900/60 text-red-300 border border-red-800' : 'text-gray-500 hover:text-gray-300'
 }`}>
 <t.icon className="w-3.5 h-3.5" />
 <span className="hidden sm:inline">{t.label}</span>
 </button>
 ))}
 </div>

 {/* OVERVIEW TAB */}
 {activeTab === 'overview' && (
 <div className="space-y-5">
 {/* KPI Row */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', trend: monthlyData },
 { label: 'Claims Approved', value: `${approvalRate}%`, icon: CheckCircle, color: 'text-green-600', trend: claimTrend },
 { label: 'Revenue', value: `$${(stats.totalRevenue/1000).toFixed(1)}K`, icon: DollarSign, color: 'text-teal-600', trend: revenueTrend.map(v => v/1000) },
 { label: 'Open Alerts', value: stats.openAlerts, icon: AlertTriangle, color: 'text-red-600', trend: [1,3,2,4,2,stats.openAlerts] },
 ].map(k => (
 <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
 <div className="flex items-center justify-between mb-2">
 <k.icon className={`w-4 h-4 ${k.color}`} />
 <MiniSparkline data={k.trend} color={k.color.replace('text-','').includes('blue') ? '#60a5fa' : k.color.includes('emerald') ? '#34d399' : k.color.includes('teal') ? '#2dd4bf' : '#f87171'} />
 </div>
 <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
 <p className="text-gray-500 text-xs mt-0.5">{k.label}</p>
 </div>
 ))}
 </div>

 {/* Portal Summary */}
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Portal Activity Summary</h3>
 <div className="space-y-3">
 <Bar value={stats.totalAppointments} max={20} color="bg-blue-600" label="Appointments" sub={`${appointmentCompletionRate}% done`} />
 <Bar value={stats.totalClaims} max={10} color="bg-violet-600" label="Claims" sub={`${approvalRate}% approved`} />
 <Bar value={stats.totalBills} max={10} color="bg-amber-600" label="Bills" sub={`$${stats.totalRevenue}`} />
 <Bar value={stats.prescriptions} max={10} color="bg-emerald-600" label="Prescriptions" sub={`${stats.activePrescriptions} active`} />
 <Bar value={stats.totalLogs} max={20} color="bg-gray-600" label="System Logs" sub="" />
 </div>
 </div>

 {/* Workflow Chain */}
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">End-to-End Workflow Health</h3>
 <div className="flex items-center gap-2 flex-wrap">
 {[
 { label: 'Patient Books', count: stats.totalAppointments, color: 'bg-blue-600' },
 { label: '→ Doctor Treats', count: stats.completedAppointments, color: 'bg-emerald-600' },
 { label: '→ Hospital Bills', count: stats.totalBills, color: 'bg-amber-600' },
 { label: '→ Claim Submitted', count: stats.totalClaims, color: 'bg-violet-600' },
 { label: '→ Claim Approved', count: stats.approvedClaims, color: 'bg-teal-600' },
 { label: '→ Bank Pays', count: stats.completedPayments, color: 'bg-rose-600' },
 ].map((step, i) => (
 <div key={i} className="flex items-center gap-2">
 <div className={`${step.color} rounded-lg px-3 py-2 text-center min-w-24`}>
 <p className="text-gray-900 font-bold text-lg">{step.count}</p>
 <p className="text-white/70 text-xs">{step.label.replace('→ ', '')}</p>
 </div>
 {i < 5 && <span className="text-gray-500 text-xl font-light hidden sm:block">→</span>}
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* USERS TAB */}
 {activeTab === 'users' && (
 <div className="space-y-5">
 <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
 {[
 { role: 'Patients', count: stats.patients, color: 'bg-blue-900 border-blue-800 text-blue-400' },
 { role: 'Doctors', count: stats.doctors, color: 'bg-emerald-900 border-emerald-800 text-green-600' },
 { role: 'Hospitals', count: stats.hospitals, color: 'bg-violet-900 border-violet-800 text-purple-600' },
 { role: 'Insurance', count: stats.insurance, color: 'bg-orange-900 border-orange-800 text-orange-600' },
 { role: 'Banks', count: stats.banks, color: 'bg-teal-900 border-teal-800 text-teal-600' },
 { role: 'Admins', count: stats.totalUsers - stats.patients - stats.doctors - stats.hospitals - stats.insurance - stats.banks, color: 'bg-red-900 border-red-800 text-red-600' },
 ].map(u => (
 <div key={u.role} className={`border rounded-xl p-4 text-center ${u.color}`}>
 <p className="text-2xl font-bold">{u.count}</p>
 <p className="text-xs mt-0.5 opacity-70">{u.role}</p>
 </div>
 ))}
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">User Distribution</h3>
 <div className="space-y-3">
 {[
 { label: 'Patients', v: stats.patients, c: 'bg-blue-600' },
 { label: 'Doctors', v: stats.doctors, c: 'bg-emerald-600' },
 { label: 'Hospitals', v: stats.hospitals, c: 'bg-violet-600' },
 { label: 'Insurance', v: stats.insurance, c: 'bg-orange-600' },
 { label: 'Banks', v: stats.banks, c: 'bg-teal-600' },
 ].map(u => (
 <div key={u.label} className="flex items-center gap-3">
 <span className="text-gray-500 text-xs w-20 text-right">{u.label}</span>
 <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
 <div className={`h-full ${u.c} rounded-full flex items-center justify-end pr-2 transition-all duration-700`}
 style={{ width: `${(u.v / stats.totalUsers) * 100}%` }}>
 <span className="text-gray-900 text-xs font-bold">{u.v}</span>
 </div>
 </div>
 <span className="text-gray-500 text-xs w-10">{((u.v / stats.totalUsers) * 100).toFixed(0)}%</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">All Registered Users</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-gray-200 text-gray-500 text-xs">
 <th className="text-left pb-2 font-medium">Name</th>
 <th className="text-left pb-2 font-medium">Role</th>
 <th className="text-left pb-2 font-medium">Email</th>
 <th className="text-left pb-2 font-medium">Joined</th>
 </tr>
 </thead>
 <tbody>
 {(dbStats?.allUsers ?? []).map((u: any) => (
 <tr key={u.id} className="border-b border-gray-200/40 hover:bg-gray-50">
 <td className="py-2.5 text-gray-900 text-sm">{u.name}</td>
 <td className="py-2.5"><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{u.role}</span></td>
 <td className="py-2.5 text-gray-500 text-xs">{u.email}</td>
 <td className="py-2.5 text-gray-500 text-xs">{new Date(u.created_at ?? u.createdAt).toLocaleDateString()}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}

 {/* FINANCIAL TAB */}
 {activeTab === 'financial' && (
 <div className="space-y-5">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, color: 'text-green-600' },
 { label: 'Payments Made', value: `$${stats.paymentValue.toLocaleString()}`, color: 'text-teal-600' },
 { label: 'Claim Approval', value: `${approvalRate}%`, color: 'text-purple-600' },
 { label: 'Active Loans', value: stats.activeLoans, color: 'text-yellow-600' },
 ].map(s => (
 <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
 <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
 <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Revenue Trend (6 months)</h3>
 <div className="space-y-2">
 {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => (
 <div key={m} className="flex items-center gap-3">
 <span className="text-gray-500 text-xs w-8">{m}</span>
 <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
 <div className="h-full bg-gradient-to-r from-teal-700 to-emerald-600 rounded-lg flex items-center justify-end pr-2 transition-all"
 style={{ width: `${(revenueTrend[i] / 25000) * 100}%` }}>
 <span className="text-gray-900 text-xs font-bold">${(revenueTrend[i]/1000).toFixed(1)}K</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="grid md:grid-cols-2 gap-4">
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Claims Breakdown</h3>
 {[
 { label: 'Approved', count: stats.approvedClaims, color: 'bg-emerald-600' },
 { label: 'Rejected', count: stats.rejectedClaims, color: 'bg-red-600' },
 { label: 'Pending/Review', count: stats.totalClaims - stats.approvedClaims - stats.rejectedClaims, color: 'bg-amber-600' },
 ].map(c => (
 <div key={c.label} className="flex items-center gap-3 mb-2">
 <div className={`w-3 h-3 rounded-full ${c.color} shrink-0`} />
 <span className="text-gray-500 text-xs flex-1">{c.label}</span>
 <span className="text-gray-900 font-bold text-sm">{c.count}</span>
 <span className="text-gray-500 text-xs">{stats.totalClaims > 0 ? ((c.count / stats.totalClaims) * 100).toFixed(0) : 0}%</span>
 </div>
 ))}
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Payment Status</h3>
 {[
 { label: 'Completed', count: stats.completedPayments, color: 'bg-emerald-600' },
 { label: 'Processed', count: stats.totalPayments - stats.completedPayments, color: 'bg-blue-600' },
 { label: 'Pending', count: Math.max(0, stats.totalPayments - stats.completedPayments), color: 'bg-amber-600' },
 { label: 'Failed', count: 0, color: 'bg-red-600' },
 ].map(c => (
 <div key={c.label} className="flex items-center gap-3 mb-2">
 <div className={`w-3 h-3 rounded-full ${c.color} shrink-0`} />
 <span className="text-gray-500 text-xs flex-1">{c.label}</span>
 <span className="text-gray-900 font-bold text-sm">{c.count}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* SECURITY TAB */}
 {activeTab === 'security' && (
 <div className="space-y-5">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Total Alerts', value: stats.openAlerts + stats.criticalAlerts, color: 'text-gray-300' },
 { label: 'Open', value: stats.openAlerts, color: 'text-red-600' },
 { label: 'Critical', value: stats.criticalAlerts, color: 'text-orange-600' },
 { label: 'Resolved', value: 0, color: 'text-green-600' },
 ].map(s => (
 <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
 <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
 <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Alert Severity Breakdown</h3>
 {(['critical','high','medium','low'] as const).map(sev => {
 const count = sev === 'critical' ? stats.criticalAlerts : sev === 'high' ? Math.max(0, stats.openAlerts - stats.criticalAlerts) : 0;
 const colors: Record<string,string> = { critical: 'bg-red-600', high: 'bg-orange-600', medium: 'bg-amber-600', low: 'bg-blue-600' };
 return (
 <div key={sev} className="flex items-center gap-3 mb-2">
 <span className="text-gray-500 text-xs w-16 capitalize">{sev}</span>
 <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
 <div className={`h-full ${colors[sev]} rounded-full flex items-center justify-end pr-2`}
 style={{ width: stats.openAlerts + stats.criticalAlerts ? `${(count / stats.openAlerts + stats.criticalAlerts) * 100}%` : '0%' }}>
 <span className="text-gray-900 text-xs font-bold">{count}</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Recent System Logs ({stats.totalLogs} total)</h3>
 <div className="space-y-2 max-h-64 overflow-y-auto">
 {(dbStats?.recentLogs ?? []).slice(0, 15).map((log: any) => (
 <div key={log.id} className="flex items-start gap-3 text-xs border-b border-gray-200/40 pb-2">
 <span className="text-gray-500 shrink-0 w-32">{new Date(log.timestamp).toLocaleString()}</span>
 <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize shrink-0">{log.user_role ?? log.userRole}</span>
 <span className="text-gray-600 font-medium shrink-0">{log.action}</span>
 <span className="text-gray-500 truncate">{log.details}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* CLINICAL TAB */}
 {activeTab === 'clinical' && (
 <div className="space-y-5">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Appointments', value: stats.totalAppointments, color: 'text-blue-400' },
 { label: 'Completion Rate', value: `${appointmentCompletionRate}%`, color: 'text-green-600' },
 { label: 'Prescriptions', value: stats.prescriptions, color: 'text-purple-600' },
 { label: 'Active Consents', value: stats.activeConsents, color: 'text-teal-600' },
 ].map(s => (
 <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
 <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
 <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>
 <div className="grid md:grid-cols-2 gap-4">
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Appointment Status</h3>
 {(['completed','confirmed','pending','cancelled'] as const).map(s => {
 const count = s === 'completed' ? stats.completedAppointments : s === 'pending' ? stats.pendingAppointments : 0;
 const colors: Record<string,string> = { completed: 'bg-emerald-600', confirmed: 'bg-blue-600', pending: 'bg-amber-600', cancelled: 'bg-red-600' };
 return (
 <div key={s} className="flex items-center gap-3 mb-2">
 <div className={`w-2.5 h-2.5 rounded-full ${colors[s]} shrink-0`} />
 <span className="text-gray-500 text-xs flex-1 capitalize">{s}</span>
 <span className="text-gray-900 font-bold text-sm">{count}</span>
 </div>
 );
 })}
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Prescription Status</h3>
 {(['active','completed','cancelled'] as const).map(s => {
 const count = s === 'active' ? stats.activePrescriptions : s === 'completed' ? stats.prescriptions - stats.activePrescriptions : 0;
 const colors: Record<string,string> = { active: 'bg-emerald-600', completed: 'bg-gray-600', cancelled: 'bg-red-600' };
 return (
 <div key={s} className="flex items-center gap-3 mb-2">
 <div className={`w-2.5 h-2.5 rounded-full ${colors[s]} shrink-0`} />
 <span className="text-gray-500 text-xs flex-1 capitalize">{s}</span>
 <span className="text-gray-900 font-bold text-sm">{count}</span>
 </div>
 );
 })}
 </div>
 </div>
 <div className="bg-white border border-gray-200 rounded-xl p-5">
 <h3 className="text-gray-900 font-semibold text-sm mb-4">Consent Management Overview</h3>
 <div className="grid grid-cols-3 gap-4">
 {(['active','revoked','expired'] as const).map(s => {
 const count = s === 'active' ? stats.activeConsents : 0;
 const colors: Record<string,string> = { active: 'text-green-600 bg-green-50 border border-green-200', revoked: 'text-red-600 bg-red-50 border-red-200', expired: 'text-gray-500 bg-white border-gray-300' };
 return (
 <div key={s} className={`border rounded-xl p-3 text-center ${colors[s]}`}>
 <p className="text-2xl font-bold">{count}</p>
 <p className="text-xs capitalize mt-0.5 opacity-70">{s}</p>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};