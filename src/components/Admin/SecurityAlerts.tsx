import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Search, Zap, RefreshCw, CheckCircle, Clock, XCircle,
  ChevronDown, User, Globe, Filter, X, ArrowUpDown,
  AlertOctagon, ShieldAlert, Lock, Unlock, Bell, LogOut,
  RotateCcw, ChevronRight, Terminal, CheckSquare, Loader2,
  AlertTriangle, Info, Siren, Activity
} from 'lucide-react';
import { api } from '../../utils/api';
import { SecurityAlert } from '../../types';

interface SecurityAlertsProps { onBack: () => void; }

const SEVERITY = {
  low:      { bg: '#0c1a2e', border: '#1e3a5f', text: '#60a5fa', dot: '#3b82f6', label: 'LOW' },
  medium:   { bg: '#1c1408', border: '#92400e', text: '#fbbf24', dot: '#f59e0b', label: 'MEDIUM' },
  high:     { bg: '#1a0e00', border: '#b45309', text: '#fb923c', dot: '#f97316', label: 'HIGH' },
  critical: { bg: '#1a0000', border: '#991b1b', text: '#f87171', dot: '#ef4444', label: 'CRITICAL' },
} as const;

const STATUS = {
  open:          { text: '#fca5a5', pill: '#dc2626', border: '#7f1d1d', label: 'Open' },
  investigating: { text: '#fde68a', pill: '#d97706', border: '#78350f', label: 'Investigating' },
  resolved:      { text: '#86efac', pill: '#16a34a', border: '#14532d', label: 'Resolved' },
} as const;

const TYPE_LABELS: Record<SecurityAlert['alertType'], string> = {
  failed_login: 'Failed Login', unauthorized_access: 'Unauthorized Access',
  data_breach: 'Data Breach', suspicious_activity: 'Suspicious Activity', account_locked: 'Account Locked',
};

function timeAgo(d: Date) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

// ─── Investigation Steps ──────────────────────────────────────
interface IStep {
  id: string; label: string; description: string; icon: React.ElementType;
  danger?: boolean; endpoint: string; method: 'GET'|'POST';
  input?: { label: string; placeholder: string; type?: string; default?: string };
  bodyKey?: string; applicableTo: SecurityAlert['alertType'][];
}

const STEPS: IStep[] = [
  {
    id: 'user_info', label: 'Fetch User Profile & History',
    description: 'Pulls the account status from the DB: failed login count, current lock state, last login, plus the 5 most recent alerts and activity logs for this user.',
    icon: User, endpoint: '/actions/user-info', method: 'GET',
    applicableTo: ['failed_login','unauthorized_access','data_breach','suspicious_activity','account_locked'],
  },
  {
    id: 'lock_user', label: 'Lock Account',
    description: 'Sets locked_until on the users table. The login endpoint checks this field and blocks the user. A notification is written to the notifications table.',
    icon: Lock, danger: true, endpoint: '/actions/lock-user', method: 'POST',
    input: { label: 'Lock duration (minutes)', placeholder: '60', type: 'number', default: '60' },
    bodyKey: 'minutes',
    applicableTo: ['failed_login','unauthorized_access','data_breach','suspicious_activity','account_locked'],
  },
  {
    id: 'force_logout', label: 'Force Session Logout',
    description: 'Applies a 1-minute lock on the account and clears failed_login_attempts. This immediately invalidates the user\'s current JWT on their next request.',
    icon: LogOut, danger: true, endpoint: '/actions/force-logout', method: 'POST',
    applicableTo: ['unauthorized_access','data_breach','suspicious_activity'],
  },
  {
    id: 'reset_attempts', label: 'Reset Failed Login Attempts',
    description: 'Sets failed_login_attempts=0 and locked_until=NULL in the DB. Use to rehabilitate a legitimate user who was locked out by brute-force detection.',
    icon: RotateCcw, endpoint: '/actions/reset-attempts', method: 'POST',
    applicableTo: ['failed_login','account_locked'],
  },
  {
    id: 'unlock_user', label: 'Unlock Account',
    description: 'Clears locked_until and resets failed_login_attempts. Sends a notification to the user confirming their account is restored.',
    icon: Unlock, endpoint: '/actions/unlock-user', method: 'POST',
    applicableTo: ['failed_login','account_locked'],
  },
  {
    id: 'notify_user', label: 'Send Security Notice',
    description: 'Inserts a row into the notifications table for this user. They see it immediately in their notification center in-app.',
    icon: Bell, endpoint: '/actions/notify-user', method: 'POST',
    input: { label: 'Message', placeholder: 'We detected unusual activity. Please verify your recent logins.', type: 'text' },
    bodyKey: 'message',
    applicableTo: ['failed_login','unauthorized_access','data_breach','suspicious_activity','account_locked'],
  },
];

const RECOMMENDED: Record<SecurityAlert['alertType'], string[]> = {
  failed_login:        ['user_info','reset_attempts','notify_user'],
  unauthorized_access: ['user_info','force_logout','lock_user','notify_user'],
  data_breach:         ['user_info','force_logout','lock_user','notify_user'],
  suspicious_activity: ['user_info','force_logout','notify_user'],
  account_locked:      ['user_info','unlock_user','notify_user'],
};

// ─── Step Result ─────────────────────────────────────────────
const StepResult: React.FC<{ result: any; stepId: string }> = ({ result, stepId }) => {
  if (!result) return null;
  if (result.error) return (
    <div className="mt-2 p-3 rounded-lg border text-xs font-mono" style={{ background:'#1a0000', borderColor:'#7f1d1d' }}>
      <span className="text-red-400">✕ {result.error}</span>
    </div>
  );
  if (stepId === 'user_info' && result.user) {
    const u = result.user;
    return (
      <div className="mt-2 rounded-lg border overflow-hidden" style={{ background:'#0d1117', borderColor:'#21262d' }}>
        <div className="px-3 py-2 border-b text-xs font-mono font-semibold text-gray-400" style={{ borderColor:'#21262d', background:'#0a0f1a' }}>
          DB record for user {u.id?.slice(0,8)}…
        </div>
        <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
          {([['Name',u.name],['Email',u.email],['Role',u.role],
             ['Last Login',u.lastLogin?new Date(u.lastLogin).toLocaleString():'Never'],
             ['Failed Attempts',String(u.failedLoginAttempts||0)],
             ['Account Status',u.isCurrentlyLocked?'🔒 LOCKED':'✓ Active'],
             ...(u.lockedUntil?[['Locked Until',new Date(u.lockedUntil).toLocaleString()]]:[])] as [string,string][])
            .map(([k,v])=>(
              <div key={k}>
                <span className="text-gray-600">{k}: </span>
                <span className={k==='Account Status'&&u.isCurrentlyLocked?'text-red-400 font-bold':'text-gray-200'}>{v}</span>
              </div>
            ))}
        </div>
        {result.recentAlerts?.length > 0 && (
          <div className="px-3 pb-2 border-t" style={{ borderColor:'#21262d' }}>
            <p className="text-gray-600 text-xs py-1.5">Prior alerts:</p>
            {result.recentAlerts.map((a: any, i: number)=>(
              <div key={i} className="flex gap-2 text-xs font-mono py-0.5">
                <span className="w-16 shrink-0" style={{ color: SEVERITY[a.severity as keyof typeof SEVERITY]?.text }}>{a.severity.toUpperCase()}</span>
                <span className="text-gray-400">{TYPE_LABELS[a.alert_type as SecurityAlert['alertType']]||a.alert_type}</span>
                <span className="text-gray-600 ml-auto">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
        {result.recentLogs?.length > 0 && (
          <div className="px-3 pb-2 border-t" style={{ borderColor:'#21262d' }}>
            <p className="text-gray-600 text-xs py-1.5">Recent activity:</p>
            {result.recentLogs.map((l: any, i: number)=>(
              <div key={i} className="flex gap-2 text-xs font-mono py-0.5">
                <span className="text-gray-400 w-32 shrink-0 truncate">{l.action}</span>
                <span className="text-gray-600 truncate">{l.details}</span>
                <span className="text-gray-700 ml-auto shrink-0">{timeAgo(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (result.success) return (
    <div className="mt-2 p-3 rounded-lg border text-xs font-mono" style={{ background:'#052e16', borderColor:'#14532d' }}>
      <span className="text-emerald-400">✓ {result.user ? `Applied to ${result.user.name} (${result.user.email})` : 'Action completed'}</span>
      {result.lockedUntil && <div className="text-emerald-600 mt-0.5">Locked until: {new Date(result.lockedUntil).toLocaleString()}</div>}
    </div>
  );
  return null;
};

// ─── Investigation Panel ─────────────────────────────────────
const InvestigationPanel: React.FC<{
  alert: SecurityAlert; onClose: ()=>void;
  onStatusUpdate: (id: string, s: SecurityAlert['status'])=>Promise<void>; updatingStatus: boolean;
}> = ({ alert, onClose, onStatusUpdate, updatingStatus }) => {
  const sev = SEVERITY[alert.severity];
  const recommended = RECOMMENDED[alert.alertType] || [];
  const [done,  setDone]    = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string,any>>({});
  const [running, setRunning] = useState<string|null>(null);
  const [inputs,  setInputs]  = useState<Record<string,string>>({});
  const [expanded, setExpanded] = useState<string|null>('user_info');
  const [msg, setMsg] = useState('We detected suspicious activity on your account. Please review your recent sessions and change your password.');

  const run = async (step: IStep) => {
    setRunning(step.id);
    try {
      const token = localStorage.getItem('auth_token');
      const headers: any = { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) };
      let body: string|undefined;
      if (step.method === 'POST' && step.bodyKey) {
        const val = step.id === 'notify_user' ? msg : inputs[step.id] ?? step.input?.default ?? '';
        body = JSON.stringify({ [step.bodyKey]: step.input?.type==='number' ? Number(val) : val });
      }
      const res  = await fetch(`/api/security-alerts/${alert.id}${step.endpoint}`, { method: step.method, headers, body });
      const data = await res.json();
      setResults(p => ({ ...p, [step.id]: data }));
      if (!data.error) setDone(p => new Set([...p, step.id]));
      setExpanded(step.id);
    } catch(err: any) {
      setResults(p => ({ ...p, [step.id]: { error: err.message } }));
    } finally { setRunning(null); }
  };

  const applicable = STEPS.filter(s => s.applicableTo.includes(alert.alertType));
  const allRecoDone = recommended.every(id => done.has(id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background:'rgba(0,0,0,0.88)', backdropFilter:'blur(6px)' }}>
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
           style={{ background:'#0d1117', border:'1px solid #30363d' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor:'#21262d' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background:`${sev.dot}22`, border:`1px solid ${sev.border}` }}>
              <ShieldAlert className="w-4 h-4" style={{ color:sev.text }} />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">
                <span style={{ color:sev.text }}>{sev.label}</span> · {TYPE_LABELS[alert.alertType]}
              </div>
              <div className="text-gray-600 text-xs font-mono">{done.size}/{applicable.length} actions completed</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert summary */}
        <div className="px-5 py-3 border-b shrink-0" style={{ borderColor:'#21262d', background:sev.bg }}>
          <p className="text-gray-200 text-sm">{alert.alertMessage}</p>
          <div className="flex gap-3 mt-1.5 text-xs text-gray-500 font-mono flex-wrap">
            {alert.ipAddress && <span><Globe className="w-3 h-3 inline mr-1"/>{alert.ipAddress}</span>}
            {alert.userId    && <span><User  className="w-3 h-3 inline mr-1"/>{alert.userId.slice(0,12)}…</span>}
            <span><Clock className="w-3 h-3 inline mr-1"/>{new Date(alert.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-2.5 border-b shrink-0 flex items-start gap-2"
             style={{ borderColor:'#21262d', background: allRecoDone && done.size>0 ? '#0a140a' : '#080d14' }}>
          {allRecoDone && done.size > 0
            ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0"/><span className="text-emerald-400 text-xs font-mono">All recommended steps done — ready to resolve</span></>
            : <><Activity className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0"/><div className="text-xs font-mono text-gray-500">
                Recommended: {recommended.map((id, i) => {
                  const s = STEPS.find(x=>x.id===id)!;
                  const isDone = done.has(id);
                  return <span key={id}>{i>0 && <span className="text-gray-700"> → </span>}
                    <span style={{ color: isDone?'#4ade80':'#60a5fa', textDecoration: isDone?'line-through':undefined }}>
                      {isDone && '✓ '}{s?.label}
                    </span></span>;
                })}
              </div></>
          }
        </div>

        {/* Steps */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
          {applicable.map((step, idx) => {
            const isRunning = running === step.id;
            const isDone    = done.has(step.id);
            const hasError  = results[step.id]?.error;
            const isExpanded = expanded === step.id;
            const isReco    = recommended.includes(step.id);
            const Icon      = step.icon;
            return (
              <div key={step.id} className="rounded-xl border overflow-hidden transition-all"
                   style={{ borderColor: hasError?'#7f1d1d':isDone?'#14532d':isReco?'#1e3a5f':'#21262d',
                            background:  hasError?'#0d0000':isDone?'#0a1a0a':'#111827' }}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                     onClick={() => setExpanded(isExpanded ? null : step.id)}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono font-bold"
                       style={{ background: hasError?'#1a0000':isDone?'#052e16':'#1f2937',
                                border:`1px solid ${hasError?'#7f1d1d':isDone?'#16a34a':'#374151'}`,
                                color: hasError?'#f87171':isDone?'#86efac':'#6b7280' }}>
                    {isDone&&!hasError ? <CheckSquare className="w-3.5 h-3.5"/> : hasError ? <XCircle className="w-3.5 h-3.5"/> : idx+1}
                  </div>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: step.danger?'#f87171':'#9ca3af' }}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{step.label}</span>
                      {isReco && !isDone && <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                                                   style={{ background:'#0c1a2e', color:'#60a5fa', border:'1px solid #1e3a5f' }}>recommended</span>}
                      {step.danger && <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                                            style={{ background:'#1a0000', color:'#f87171', border:'1px solid #7f1d1d' }}>⚠ irreversible</span>}
                    </div>
                    {!isExpanded && <p className="text-gray-600 text-xs mt-0.5 truncate font-sans">{step.description}</p>}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 shrink-0 transition-transform duration-200 ${isExpanded?'rotate-180':''}`}/>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-3" style={{ borderColor:'#21262d' }}>
                    <p className="text-gray-400 text-xs font-sans leading-relaxed">{step.description}</p>

                    {step.input && step.id !== 'notify_user' && (
                      <div>
                        <label className="text-gray-500 text-xs font-mono block mb-1">{step.input.label}</label>
                        <input type={step.input.type||'text'} value={inputs[step.id]??step.input.default??''}
                               onChange={e=>setInputs(p=>({...p,[step.id]:e.target.value}))}
                               placeholder={step.input.placeholder}
                               className="w-40 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                               style={{ background:'#0d1117', border:'1px solid #30363d', color:'#e5e7eb' }}/>
                      </div>
                    )}
                    {step.id === 'notify_user' && (
                      <div>
                        <label className="text-gray-500 text-xs font-mono block mb-1">Message to send to user (saved to notifications table)</label>
                        <textarea rows={3} value={msg} onChange={e=>setMsg(e.target.value)}
                                  className="w-full rounded-lg px-3 py-2 text-xs font-sans focus:outline-none resize-none"
                                  style={{ background:'#0d1117', border:'1px solid #30363d', color:'#e5e7eb' }}/>
                      </div>
                    )}

                    <button onClick={()=>run(step)} disabled={isRunning}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all disabled:opacity-50"
                            style={{ background: step.danger?'#1a0000':isDone?'#0a1a1a':'#0c1a2e',
                                     color: step.danger?'#f87171':isDone?'#22d3ee':'#60a5fa',
                                     border:`1px solid ${step.danger?'#7f1d1d':isDone?'#0e7490':'#1e3a5f'}` }}>
                      {isRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Running…</>
                       : isDone   ? <><RefreshCw className="w-3.5 h-3.5"/> Re-run</>
                       : step.method==='GET' ? <><Terminal className="w-3.5 h-3.5"/> Fetch from DB</>
                       : <><ChevronRight className="w-3.5 h-3.5"/> Execute</>}
                    </button>

                    {results[step.id] !== undefined && <StepResult result={results[step.id]} stepId={step.id}/>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 shrink-0" style={{ borderColor:'#21262d', background:'#080d14' }}>
          <p className="text-gray-600 text-xs font-mono mb-3">Update alert status after investigation:</p>
          <div className="flex gap-2">
            {alert.status==='open' && (
              <button onClick={()=>onStatusUpdate(alert.id,'investigating')} disabled={updatingStatus}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ background:'#1c1408', color:'#fbbf24', border:'1px solid #92400e' }}>
                {updatingStatus?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Clock className="w-3.5 h-3.5"/>}
                Mark Investigating
              </button>
            )}
            {alert.status!=='resolved' && (
              <button onClick={()=>{onStatusUpdate(alert.id,'resolved');onClose();}} disabled={updatingStatus}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ background:'#052e16', color:'#86efac', border:'1px solid #14532d' }}>
                {updatingStatus?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<CheckCircle className="w-3.5 h-3.5"/>}
                Mark Resolved & Close
              </button>
            )}
            {alert.status==='resolved' && (
              <button onClick={()=>onStatusUpdate(alert.id,'open')} disabled={updatingStatus}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ background:'#1a0000', color:'#fca5a5', border:'1px solid #7f1d1d' }}>
                {updatingStatus?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<XCircle className="w-3.5 h-3.5"/>}
                Reopen Alert
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────
export const SecurityAlerts: React.FC<SecurityAlertsProps> = ({ onBack }) => {
  const [alerts, setAlerts]         = useState<SecurityAlert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string|null>(null);
  const [selected, setSelected]     = useState<SecurityAlert|null>(null);
  const [updating, setUpdating]     = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [sortOrder, setSortOrder]   = useState<'desc'|'asc'>('desc');
  const [search, setSearch]         = useState('');
  const [statusF, setStatusF]       = useState<'all'|SecurityAlert['status']>('all');
  const [severityF, setSeverityF]   = useState<'all'|SecurityAlert['severity']>('all');
  const [showF, setShowF]           = useState(false);

  const load = useCallback(async (silent=false) => {
    if(!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try { setAlerts(await api.admin.getSecurityAlerts('admin')); }
    catch(e:any) { setError(e.message||'Failed to load'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{ const id=setInterval(()=>load(true),30000); return ()=>clearInterval(id); },[load]);

  const updateStatus = async (id: string, status: SecurityAlert['status']) => {
    setUpdating(true);
    try {
      await api.admin.updateSecurityAlertStatus(id, status, 'admin');
      setAlerts(p => p.map(a => a.id===id ? {...a, status, resolvedAt: status==='resolved'?new Date():undefined} : a));
      if(selected?.id===id) setSelected(p => p?{...p,status}:null);
    } catch(e:any) { setError('Update failed: '+e.message); }
    finally { setUpdating(false); }
  };

  const simulate = async () => {
    setSimulating(true); setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/security-alerts/simulate',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}});
      if(!res.ok) throw new Error((await res.json()).error||'Failed');
      await load(true);
    } catch(e:any){ setError('Simulation error: '+e.message); }
    finally { setSimulating(false); }
  };

  const filtered = alerts
    .filter(a => {
      if(statusF!=='all'   && a.status   !==statusF)   return false;
      if(severityF!=='all' && a.severity !==severityF) return false;
      if(search){ const q=search.toLowerCase(); return a.alertMessage.toLowerCase().includes(q)||TYPE_LABELS[a.alertType].toLowerCase().includes(q)||(a.ipAddress||'').includes(q)||(a.userId||'').includes(q); }
      return true;
    })
    .sort((a,b)=>{ const d=new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime(); return sortOrder==='desc'?-d:d; });

  const stats = { total:alerts.length, open:alerts.filter(a=>a.status==='open').length, critical:alerts.filter(a=>a.severity==='critical').length, resolved:alerts.filter(a=>a.status==='resolved').length };

  return (
    <div className="min-h-full p-6" style={{ background:'#0a0f1a', fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>
      <button onClick={onBack} className="text-gray-600 hover:text-gray-300 text-xs mb-5 flex items-center gap-1 transition-colors">← back to dashboard</button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#ef4444,#b91c1c)' }}>
            <ShieldAlert className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Security Alerts</h1>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{loading?'Loading…':`${alerts.length} total · auto-refresh 30s · click to investigate`}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>load(true)} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-50"
                  style={{ background:'#111827', color:'#9ca3af', border:'1px solid #1f2937' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing?'animate-spin':''}`}/> Refresh
          </button>
          <button onClick={simulate} disabled={simulating} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium disabled:opacity-50"
                  style={{ background:'#1a1000', color:'#fbbf24', border:'1px solid #92400e' }}>
            <Zap className={`w-3.5 h-3.5 ${simulating?'animate-spin':''}`}/> {simulating?'Simulating…':'Simulate Alert'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-start gap-2 border" style={{ background:'#1a0000', borderColor:'#7f1d1d' }}>
          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0"/><span className="text-red-400 text-xs font-mono flex-1">{error}</span>
          <button onClick={()=>setError(null)}><X className="w-3.5 h-3.5 text-gray-600"/></button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([{l:'Total',v:stats.total,c:'#e5e7eb',bg:'#111827',bd:'#1f2937'},{l:'Open',v:stats.open,c:'#f87171',bg:'#1a0000',bd:'#7f1d1d'},{l:'Critical',v:stats.critical,c:'#fb923c',bg:'#1a0e00',bd:'#b45309'},{l:'Resolved',v:stats.resolved,c:'#86efac',bg:'#052e16',bd:'#14532d'}] as const)
          .map(s=>(
            <div key={s.l} className="rounded-xl p-4 border" style={{ background:s.bg, borderColor:s.bd }}>
              <p className="text-gray-600 text-xs font-mono">{s.l}</p>
              {loading ? <div className="w-8 h-7 rounded mt-1 animate-pulse bg-gray-800"/> : <p className="text-2xl font-bold mt-1" style={{ color:s.c }}>{s.v}</p>}
            </div>
          ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-600"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search alerts, IPs, user IDs…"
                 className="w-full rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:outline-none"
                 style={{ background:'#111827', border:'1px solid #1f2937', color:'#e5e7eb' }}/>
        </div>
        <button onClick={()=>setShowF(!showF)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono"
                style={{ background:showF?'#1e3a5f':'#111827', border:`1px solid ${showF?'#3b82f6':'#1f2937'}`, color:showF?'#60a5fa':'#9ca3af' }}>
          <Filter className="w-3.5 h-3.5"/> Filters
        </button>
        <button onClick={()=>setSortOrder(s=>s==='desc'?'asc':'desc')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono"
                style={{ background:'#111827', border:'1px solid #1f2937', color:'#9ca3af' }}>
          <ArrowUpDown className="w-3.5 h-3.5"/> {sortOrder==='desc'?'Newest':'Oldest'}
        </button>
      </div>

      {showF && (
        <div className="mb-4 p-4 rounded-xl flex flex-wrap gap-4 border" style={{ background:'#111827', borderColor:'#1f2937' }}>
          {([{l:'Status',v:statusF,fn:setStatusF,opts:[['all','All'],['open','Open'],['investigating','Investigating'],['resolved','Resolved']]},
             {l:'Severity',v:severityF,fn:setSeverityF,opts:[['all','All'],['low','Low'],['medium','Medium'],['high','High'],['critical','Critical']]}] as any[])
            .map(({l,v,fn,opts})=>(
              <div key={l}>
                <label className="text-gray-600 text-xs font-mono block mb-1">{l}</label>
                <div className="relative">
                  <select value={v} onChange={(e:any)=>fn(e.target.value)} className="appearance-none rounded-lg px-3 py-1.5 pr-7 text-xs font-mono"
                          style={{ background:'#0a0f1a', border:'1px solid #1f2937', color:'#e5e7eb' }}>
                    {opts.map(([ov,ol]: string[])=><option key={ov} value={ov}>{ol}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-gray-600 pointer-events-none"/>
                </div>
              </div>
            ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i=>(
            <div key={i} className="rounded-xl p-4 border animate-pulse" style={{ background:'#111827', borderColor:'#1f2937' }}>
              <div className="flex gap-3"><div className="w-2.5 h-2.5 rounded-full bg-gray-800 mt-1"/><div className="flex-1 space-y-2"><div className="h-3 rounded bg-gray-800 w-1/3"/><div className="h-2.5 rounded bg-gray-800 w-2/3"/></div></div>
            </div>
          ))}
        </div>
      ) : filtered.length===0 ? (
        <div className="text-center py-16">
          <Shield className="w-10 h-10 mx-auto mb-3 text-gray-800"/>
          <p className="text-gray-600 text-sm font-mono">{alerts.length===0?'No alerts in database yet.':'No alerts match filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-700 font-mono mb-2">{filtered.length} of {alerts.length} alerts</p>
          {filtered.map(alert => {
            const sev = SEVERITY[alert.severity];
            const st  = STATUS[alert.status];
            const isOpen = alert.status==='open';
            return (
              <div key={alert.id} className="rounded-xl border overflow-hidden transition-all hover:brightness-110"
                   style={{ background:sev.bg, borderColor:isOpen?sev.dot+'55':sev.border }}>
                <div className="flex items-start gap-3 p-4 cursor-pointer group" onClick={()=>setSelected(alert)}>
                  <div className="mt-1 shrink-0 relative">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:sev.dot }}/>
                    {isOpen && <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background:sev.dot }}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold" style={{ color:sev.text }}>{sev.label}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-200 text-xs font-medium">{TYPE_LABELS[alert.alertType]}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                            style={{ background:`${st.pill}22`, color:st.text, border:`1px solid ${st.border}` }}>{st.label}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-snug mb-1.5 font-sans">{alert.alertMessage}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600 font-mono flex-wrap">
                      {alert.ipAddress && <span><Globe className="w-3 h-3 inline mr-1"/>{alert.ipAddress}</span>}
                      {alert.userId    && <span><User  className="w-3 h-3 inline mr-1"/>{alert.userId.slice(0,8)}…</span>}
                      <span><Clock className="w-3 h-3 inline mr-1"/>{timeAgo(alert.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <span className="text-gray-600 text-xs font-mono">Investigate</span>
                    <ChevronRight className="w-4 h-4 text-gray-600"/>
                  </div>
                </div>
                {alert.status!=='resolved' && (
                  <div className="border-t flex" style={{ borderColor:sev.border+'88' }} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>setSelected(alert)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono hover:bg-white/10 transition-colors"
                            style={{ color:'#60a5fa', borderRight:`1px solid ${sev.border}88` }}>
                      <Terminal className="w-3 h-3"/> {alert.status==='open'?'Investigate':'Continue Investigation'}
                    </button>
                    <button onClick={()=>updateStatus(alert.id,'resolved')} disabled={updating}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono hover:bg-white/10 transition-colors disabled:opacity-50"
                            style={{ color:'#86efac' }}>
                      <CheckCircle className="w-3 h-3"/> Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <InvestigationPanel alert={selected} onClose={()=>setSelected(null)}
          onStatusUpdate={updateStatus} updatingStatus={updating}/>
      )}
    </div>
  );
};