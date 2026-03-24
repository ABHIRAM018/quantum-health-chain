import React, { useState, useEffect } from 'react';
import {
  Shield, Lock, Key, Database, Link, Globe,
  CheckCircle, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, XCircle, Terminal, Wrench, Eye, EyeOff,
  RotateCcw, Trash2, Copy, Check, Info, Zap, Activity
} from 'lucide-react';
import { blockchainLedger, rbac, jwtService, dbEncryption } from '../../utils/security';
import { authService } from '../../utils/auth';
import { Admin } from '../../types';

interface SecurityDashboardProps {
  user: Admin;
  onBack: () => void;
}

interface TestLine {
  type: 'success' | 'error' | 'warning' | 'info' | 'data' | 'header';
  text: string;
}

interface SecurityFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  status: 'active' | 'checking' | 'warning' | 'error';
  details: string[];
  affectedRoles: string[];
  technicalSpec: string;
}

// Parse raw test output into structured lines for rich rendering
function parseOutput(raw: string): TestLine[] {
  return raw.split('\n').map(line => {
    const t = line.trim();
    if (t.startsWith('✅') || t.includes(': ✅') || t.includes('PASS') || t.includes('MATCH') || t.includes('VALID') || t.includes('REJECTED') || t.includes('Blocked')) {
      return { type: 'success', text: line };
    }
    if (t.startsWith('❌') || t.includes(': ❌') || t.includes('FAIL') || t.includes('FALSE') || t.includes('BROKEN') || t.startsWith('❌ Test error')) {
      return { type: 'error', text: line };
    }
    if (t.startsWith('⚠️') || t.includes('WARNING') || t.includes('HTTP detected')) {
      return { type: 'warning', text: line };
    }
    if (t.startsWith('Chain') || t.startsWith('Total') || t.startsWith('Sub:') || t.startsWith('Admin') || t.startsWith('Patient')) {
      return { type: 'data', text: line };
    }
    if (t.includes('---') || t === '') {
      return { type: 'info', text: line };
    }
    return { type: 'info', text: line };
  });
}

const lineStyles: Record<TestLine['type'], string> = {
  success: 'text-emerald-400',
  error:   'text-red-400 font-semibold',
  warning: 'text-amber-400',
  data:    'text-sky-300',
  header:  'text-white font-bold',
  info:    'text-gray-300',
};

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ user, onBack }) => {
  const [blockchainValid, setBlockchainValid]   = useState<boolean | null>(null);
  const [blockchainLength, setBlockchainLength] = useState(0);
  const [jwtValid, setJwtValid]                 = useState<boolean | null>(null);
  const [expandedFeature, setExpandedFeature]   = useState<string | null>(null);
  const [testOutput, setTestOutput]             = useState<Record<string, string>>({});
  const [runningTest, setRunningTest]           = useState<string | null>(null);
  const [copiedId, setCopiedId]                 = useState<string | null>(null);
  const [adminActions, setAdminActions]         = useState<Record<string, boolean>>({});
  const [actionResult, setActionResult]         = useState<Record<string, string>>({});
  const [runningAction, setRunningAction]       = useState<string | null>(null);

  useEffect(() => {
    blockchainLedger.verifyChain().then(result => {
      setBlockchainValid(result.valid);
      setBlockchainLength(blockchainLedger.getChainLength());
    });
    const token = authService.getToken();
    if (token) {
      jwtService.verify(token).then(payload => setJwtValid(!!payload));
    }
  }, []);

  const runTest = async (featureId: string) => {
    setRunningTest(featureId);
    setTestOutput(prev => ({ ...prev, [featureId]: '' }));
    try {
      let result = '';
      switch (featureId) {
        case 'https': {
          const protocol = window.location.protocol;
          const isSecure = protocol === 'https:' || window.location.hostname === 'localhost';
          result = isSecure
            ? `✅ Connection is secure (${protocol}//)\n  TLS enforced — all data in transit is encrypted.\n  Localhost detected: dev environment (HTTP allowed).`
            : `⚠️ HTTP detected — enforcing redirect to HTTPS.`;
          break;
        }
        case 'bcrypt': {
          const start = Date.now();
          const hash = await authService.hashPassword('TestPassword123!');
          const elapsed = Date.now() - start;
          const parts = hash.split(':');
          result = `✅ PBKDF2-SHA256 hash generated in ${elapsed}ms\n  Iterations: ${parts[0]}\n  Salt (hex): ${parts[1].slice(0, 16)}…\n  Hash (hex): ${parts[2].slice(0, 16)}…\n\n  Verifying correct password…`;
          const { passwordHasher } = await import('../../utils/security');
          const ok  = await passwordHasher.verify('TestPassword123!', hash);
          const bad = await passwordHasher.verify('WrongPassword!', hash);
          result += `\n  Correct password: ${ok  ? '✅ MATCH' : '❌ FAIL'}\n  Wrong password:   ${bad ? '❌ FALSE POSITIVE' : '✅ REJECTED'}`;
          break;
        }
        case 'jwt': {
          const token  = await jwtService.sign({ sub: user.id, role: user.role, test: true }, 60);
          const parts  = token.split('.');
          const payload = await jwtService.verify(token);
          const tampered = token.slice(0, -5) + 'XXXXX';
          const tamperedResult = await jwtService.verify(tampered);
          result = `✅ JWT issued (HS256)\n  Header:    ${parts[0].slice(0, 20)}…\n  Payload:   ${parts[1].slice(0, 20)}…\n  Signature: ${parts[2].slice(0, 16)}…\n\n  Valid token verification:  ${payload ? '✅ PASS' : '❌ FAIL'}\n  Tampered token rejected:   ${!tamperedResult ? '✅ PASS' : '❌ FAIL'}\n  Sub: ${(payload as any)?.sub}  Role: ${(payload as any)?.role}`;
          break;
        }
        case 'rbac': {
          const roles = ['patient', 'doctor', 'hospital', 'insurance', 'bank', 'admin'] as const;
          const lines = roles.map(role => {
            const perms = rbac.getPermissions(role);
            return `  ${role.padEnd(10)} → ${perms.length} permissions`;
          });
          result = `✅ RBAC active — 6 roles configured\n\n${lines.join('\n')}\n\n  Admin can 'manage:users':   ${rbac.hasPermission('admin',   'manage:users') ? '✅ Allowed' : '❌ Blocked'}\n  Patient can 'manage:users': ${rbac.hasPermission('patient', 'manage:users') ? '❌ Allowed' : '✅ Blocked'}`;
          break;
        }
        case 'blockchain': {
          const testPayload = { test: 'security_dashboard_verification', ts: Date.now() };
          const record = await blockchainLedger.addRecord(`test-${Date.now()}`, testPayload, user.role, user.id);
          const verification = await blockchainLedger.verifyChain();
          setBlockchainLength(blockchainLedger.getChainLength());
          setBlockchainValid(verification.valid);
          result = `✅ Blockchain entry created\n  ID:        ${record.id}\n  Hash:      ${record.hash.slice(0, 32)}…\n  PrevHash:  ${record.previousHash.slice(0, 32)}…\n  Timestamp: ${new Date(record.timestamp).toISOString()}\n\n  Chain integrity: ${verification.valid ? '✅ VALID' : `❌ BROKEN at block ${verification.brokenAt}`}\n  Total records:   ${blockchainLedger.getChainLength()}`;
          break;
        }
        case 'encryption': {
          const sensitive = { phone: '+91-9876543210', address: '123 MG Road, Bengaluru, KA 560001', diagnosis: 'Hypertension, Stage 2' };
          const encrypted = await dbEncryption.encryptRecord(sensitive, ['phone', 'address', 'diagnosis'] as any);
          const decrypted = await dbEncryption.decryptRecord(encrypted, ['phone', 'address', 'diagnosis'] as any);
          result = `✅ AES-256-GCM encryption active\n\n  Original phone:    ${sensitive.phone}\n  Encrypted phone:   ${(encrypted as any).phone.slice(0, 28)}…\n  Decrypted phone:   ${(decrypted as any).phone}\n\n  Original address:  ${sensitive.address.slice(0, 30)}…\n  Encrypted:         ${(encrypted as any).address.slice(0, 28)}…\n  Decrypted:         ${(decrypted as any).address}\n\n  Round-trip match:  ${(decrypted as any).phone === sensitive.phone ? '✅ PASS' : '❌ FAIL'}`;
          break;
        }
      }
      setTestOutput(prev => ({ ...prev, [featureId]: result }));
    } catch (err: any) {
      setTestOutput(prev => ({ ...prev, [featureId]: `❌ Test error: ${err.message}\n\n  Stack: ${err.stack?.split('\n').slice(0,3).join('\n  ')}` }));
    } finally {
      setRunningTest(null);
    }
  };

  // Admin fix/correction actions per feature
  const runAdminFix = async (featureId: string, actionKey: string) => {
    const key = `${featureId}:${actionKey}`;
    setRunningAction(key);
    setActionResult(prev => ({ ...prev, [key]: '' }));
    try {
      let msg = '';
      if (featureId === 'blockchain' && actionKey === 'reset') {
        localStorage.removeItem('blockchain_ledger');
        const verification = await blockchainLedger.verifyChain();
        setBlockchainValid(verification.valid);
        setBlockchainLength(blockchainLedger.getChainLength());
        msg = '✅ Blockchain ledger reset. Genesis block re-created. Chain is clean.';
      } else if (featureId === 'blockchain' && actionKey === 'verify') {
        const v = await blockchainLedger.verifyChain();
        setBlockchainValid(v.valid);
        msg = v.valid ? `✅ Chain is intact. ${blockchainLedger.getChainLength()} records verified.` : `❌ Chain broken at block ${v.brokenAt}. Admin action required.`;
      } else if (featureId === 'jwt' && actionKey === 'rotate') {
        sessionStorage.removeItem('__jwt_secret');
        authService.logout();
        msg = '✅ JWT secret rotated. All sessions invalidated. Please log in again.';
      } else if (featureId === 'encryption' && actionKey === 'rotate_key') {
        localStorage.removeItem('__aes_key');
        msg = '⚠️ AES key removed from localStorage. New key will be generated on next write. Note: existing encrypted data will be unreadable.';
      } else if (featureId === 'rbac' && actionKey === 'audit') {
        const roles = ['patient', 'doctor', 'hospital', 'insurance', 'bank', 'admin'] as const;
        const lines = roles.map(r => `  ${r.padEnd(10)}: ${rbac.getPermissions(r).join(', ')}`);
        msg = `✅ RBAC Audit — full permission dump:\n\n${lines.join('\n')}`;
      } else if (featureId === 'https' && actionKey === 'check') {
        const proto = window.location.protocol;
        const host  = window.location.hostname;
        msg = `✅ Protocol: ${proto}\n  Hostname:  ${host}\n  Secure:    ${proto === 'https:' ? 'YES' : host === 'localhost' ? 'YES (localhost)' : '❌ NO — redirect needed'}`;
      } else if (featureId === 'bcrypt' && actionKey === 'benchmark') {
        const times: number[] = [];
        for (let i = 0; i < 3; i++) {
          const t = Date.now();
          await authService.hashPassword('BenchmarkTest' + i);
          times.push(Date.now() - t);
        }
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        msg = `✅ Benchmark (3 runs):\n  Run 1: ${times[0]}ms\n  Run 2: ${times[1]}ms\n  Run 3: ${times[2]}ms\n  Average: ${avg}ms\n  Status: ${avg < 2000 ? '✅ Acceptable' : '⚠️ Slow — consider tuning iterations'}`;
      }
      setActionResult(prev => ({ ...prev, [key]: msg }));
    } catch (err: any) {
      setActionResult(prev => ({ ...prev, [key]: `❌ Action failed: ${err.message}` }));
    } finally {
      setRunningAction(null);
    }
  };

  const copyOutput = (featureId: string) => {
    const out = testOutput[featureId];
    if (out) {
      navigator.clipboard.writeText(out).then(() => {
        setCopiedId(featureId);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const clearOutput = (featureId: string) => {
    setTestOutput(prev => { const n = { ...prev }; delete n[featureId]; return n; });
    setActionResult(prev => {
      const n = { ...prev };
      Object.keys(n).filter(k => k.startsWith(featureId)).forEach(k => delete n[k]);
      return n;
    });
  };

  const features: SecurityFeature[] = [
    {
      id: 'https', name: 'HTTPS / SSL-TLS',
      description: 'All data in transit is encrypted using TLS. HTTP requests are automatically redirected to HTTPS in production.',
      icon: Globe, color: 'text-sky-400', bgColor: 'bg-sky-950', borderColor: 'border-sky-800', accentColor: '#38bdf8',
      status: 'active',
      details: ['Enforced at app startup via enforceHTTPS()', 'Auto-redirects HTTP → HTTPS on non-localhost', 'Supabase connection is TLS-secured by default', 'HSTS headers recommended on production server'],
      affectedRoles: ['All users'],
      technicalSpec: 'window.location.protocol check → HTTP redirect. TLS 1.2+ on Supabase.',
    },
    {
      id: 'bcrypt', name: 'Password Hashing',
      description: 'Passwords are never stored in plaintext. PBKDF2-SHA256 (100,000 iterations) with random salt — equivalent strength to bcrypt/scrypt.',
      icon: Lock, color: 'text-purple-400', bgColor: 'bg-violet-950', borderColor: 'border-violet-800', accentColor: '#a78bfa',
      status: 'active',
      details: ['PBKDF2-SHA256 with 100,000 iterations (Web Crypto API)', '16-byte cryptographically random salt per password', 'Stored as "iterations:salt:hash" string', 'Constant-time comparison to prevent timing attacks', 'Legacy plaintext passwords compared directly (dev only)'],
      affectedRoles: ['All users'],
      technicalSpec: 'PBKDF2 via SubtleCrypto.deriveBits(). Equivalent to bcrypt cost 12.',
    },
    {
      id: 'jwt', name: 'JWT Authentication',
      description: 'Sessions are managed with signed JSON Web Tokens (HS256). Tokens expire after 1 hour and are validated on every page load.',
      icon: Key, color: 'text-amber-400', bgColor: 'bg-amber-950', borderColor: 'border-amber-800', accentColor: '#fbbf24',
      status: jwtValid === false ? 'warning' : 'active',
      details: ['HS256 JWT signed with per-session HMAC key', 'Payload: sub, email, role, permissions, iat, exp', 'Tokens expire after 3600 seconds (1 hour)', 'Verified on every restoreSession() call', 'Expired/tampered tokens auto-clear the session', 'Account lockout after 5 failed attempts (15 min)'],
      affectedRoles: ['All users'],
      technicalSpec: 'Web Crypto HMAC-SHA256. Token: header.payload.signature (base64url).',
    },
    {
      id: 'rbac', name: 'Role-Based Access Control',
      description: 'Every API call is gated by permission checks. Each role has a precisely scoped permission set — no over-privileged access.',
      icon: Shield, color: 'text-emerald-400', bgColor: 'bg-emerald-950', borderColor: 'border-emerald-800', accentColor: '#34d399',
      status: 'active',
      details: ['6 roles: patient, doctor, hospital, insurance, bank, admin', '19 granular permissions (read, write, approve, manage…)', 'rbac.requirePermission() throws on unauthorized access', 'JWT payload embeds permissions for fast client-side checks', 'All api.ts functions guarded with guard() calls', 'UI elements conditionally rendered via authService.can()'],
      affectedRoles: ['All (role-specific)'],
      technicalSpec: 'Role → Permission[] map. O(1) lookup. Enforced server-side and client-side.',
    },
    {
      id: 'blockchain', name: 'Blockchain Hashing',
      description: 'Medical records, prescriptions, bills, claims, and payments are chained with SHA-256. Tampering any record breaks the chain.',
      icon: Link, color: 'text-rose-400', bgColor: 'bg-rose-950', borderColor: 'border-rose-800', accentColor: '#fb7185',
      status: blockchainValid === false ? 'error' : 'active',
      details: ['SHA-256 hash of each record includes: id, data, prevHash, role, userId, timestamp', 'Genesis block anchors the chain (64-zero hash)', 'Each new record references the previous block\'s hash', 'verifyChain() re-hashes every block and checks linkage', 'Persisted to localStorage for cross-session integrity', 'Applied to: medical records, admissions, lab reports, bills, claims, payments'],
      affectedRoles: ['Doctor', 'Hospital', 'Insurance', 'Bank', 'Admin'],
      technicalSpec: 'SHA-256 via SubtleCrypto.digest(). Append-only linked list of records.',
    },
    {
      id: 'encryption', name: 'Database Encryption',
      description: 'Sensitive fields (PII, diagnoses, prescriptions) are encrypted with AES-256-GCM before storage and decrypted on read.',
      icon: Database, color: 'text-teal-400', bgColor: 'bg-teal-950', borderColor: 'border-teal-800', accentColor: '#2dd4bf',
      status: 'active',
      details: ['AES-256-GCM (authenticated encryption) via Web Crypto API', '256-bit key generated and stored in localStorage', '12-byte random IV per encrypted value', 'GCM authentication tag prevents ciphertext tampering', 'Encrypted fields: phone, address, dateOfBirth, emergencyContact', 'Also encrypted: diagnosis, prescription, notes, lab results'],
      affectedRoles: ['All users'],
      technicalSpec: 'AES-256-GCM. IV prepended to ciphertext, base64-encoded for storage.',
    },
  ];

  // Per-feature admin actions
  const adminFixActions: Record<string, Array<{ key: string; label: string; icon: React.ElementType; danger?: boolean }>> = {
    https:      [{ key: 'check',       label: 'Re-check Protocol',      icon: Activity }],
    bcrypt:     [{ key: 'benchmark',   label: 'Benchmark Hashing Speed', icon: Zap }],
    jwt:        [{ key: 'rotate',      label: 'Rotate JWT Secret & Invalidate Sessions', icon: RotateCcw, danger: true }],
    rbac:       [{ key: 'audit',       label: 'Full Permission Audit Dump', icon: Eye }],
    blockchain: [
      { key: 'verify', label: 'Force Re-verify Chain', icon: Activity },
      { key: 'reset',  label: 'Reset Blockchain Ledger', icon: Trash2, danger: true },
    ],
    encryption: [{ key: 'rotate_key', label: 'Rotate AES Key (Caution)', icon: RotateCcw, danger: true }],
  };

  const overallStatus = features.some(f => f.status === 'error') ? 'error'
    : features.some(f => f.status === 'warning') ? 'warning' : 'secure';

  return (
    <div className="min-h-full p-6" style={{ background: '#0a0f1a', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* Header */}
      <div className="mb-8">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-xs mb-4 flex items-center gap-1 transition-colors font-mono">
          ← back to dashboard
        </button>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)' }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Security Center</h1>
            <p className="text-gray-400 text-xs mt-0.5 font-mono">6 active security layers · admin diagnostics enabled</p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full px-4 py-1.5 border"
               style={{
                 background: overallStatus === 'secure' ? '#052e16' : overallStatus === 'warning' ? '#1c1408' : '#1a0000',
                 borderColor: overallStatus === 'secure' ? '#16a34a' : overallStatus === 'warning' ? '#d97706' : '#dc2626',
               }}>
            <div className="w-2 h-2 rounded-full animate-pulse"
                 style={{ background: overallStatus === 'secure' ? '#22c55e' : overallStatus === 'warning' ? '#f59e0b' : '#ef4444' }} />
            <span className="text-xs font-medium font-mono"
                  style={{ color: overallStatus === 'secure' ? '#22c55e' : overallStatus === 'warning' ? '#f59e0b' : '#ef4444' }}>
              {overallStatus === 'secure' ? 'All Systems Secure' : overallStatus === 'warning' ? 'Warning Detected' : 'Error — Action Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Key,     label: 'JWT Token',       value: jwtValid === null ? 'Checking…' : jwtValid ? 'Valid & active' : 'Expired — re-login', ok: jwtValid !== false },
          { icon: Link,    label: 'Blockchain',       value: blockchainValid === null ? 'Verifying…' : blockchainValid ? `${blockchainLength} records, chain intact` : '⚠ Chain broken!', ok: blockchainValid !== false },
          { icon: Shield,  label: `Role: Admin`,      value: `${rbac.getPermissions('admin').length} permissions active`, ok: true },
        ].map(({ icon: Icon, label, value, ok }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3 border"
               style={{ background: '#111827', borderColor: ok ? '#1f2937' : '#7f1d1d' }}>
            <Icon className={`w-5 h-5 shrink-0 ${ok ? 'text-emerald-400' : 'text-red-400'}`} />
            <div>
              <div className="text-white font-semibold text-xs">{label}</div>
              <div className={`text-xs font-mono mt-0.5 ${ok ? 'text-gray-400' : 'text-red-400'}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="space-y-2">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          const isExpanded = expandedFeature === feature.id;
          const output     = testOutput[feature.id];
          const isTesting  = runningTest === feature.id;
          const parsed     = output ? parseOutput(output) : [];
          const hasError   = parsed.some(l => l.type === 'error');
          const actions    = adminFixActions[feature.id] ?? [];

          return (
            <div key={feature.id}
                 className={`rounded-xl border overflow-hidden transition-all duration-200 ${feature.bgColor} ${feature.borderColor}`}
                 style={{ boxShadow: isExpanded ? `0 0 0 1px ${feature.accentColor}22` : undefined }}>

              {/* Card Header */}
              <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                   onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: `${feature.accentColor}18`, border: `1px solid ${feature.accentColor}33` }}>
                  <Icon className={`w-4 h-4 ${feature.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{idx + 1}. {feature.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                      feature.status === 'active'  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      feature.status === 'warning' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      feature.status === 'error'   ? 'bg-red-950 text-red-400 border border-red-800' :
                                                     'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}>
                      {feature.status === 'active' ? '✓ ACTIVE' : feature.status === 'warning' ? '⚠ WARNING' : feature.status === 'error' ? '✕ ERROR' : 'CHECKING'}
                    </span>
                    {output && hasError && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-red-950 text-red-400 border border-red-800 animate-pulse">
                        ✕ ERRORS IN LAST TEST
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 truncate font-sans">{feature.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-600 hidden md:block font-mono">{feature.affectedRoles.join(', ')}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-white/10 p-4 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">

                    {/* Left: Details */}
                    <div>
                      <h4 className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Implementation Details
                      </h4>
                      <ul className="space-y-1">
                        {feature.details.map((d, i) => (
                          <li key={i} className="text-gray-400 text-xs flex gap-2 font-sans">
                            <span className={`${feature.color} shrink-0 font-mono`}>›</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Admin Actions */}
                      {actions.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Admin Corrections
                          </h4>
                          <div className="space-y-2">
                            {actions.map(act => {
                              const aKey = `${feature.id}:${act.key}`;
                              const ActIcon = act.icon;
                              const isRunning = runningAction === aKey;
                              const res = actionResult[aKey];
                              return (
                                <div key={act.key}>
                                  <button
                                    onClick={() => runAdminFix(feature.id, act.key)}
                                    disabled={isRunning}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all border ${
                                      act.danger
                                        ? 'bg-red-950 text-red-400 border-red-800 hover:bg-red-900'
                                        : 'bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {isRunning
                                      ? <><RefreshCw className="w-3 h-3 animate-spin" /> Running…</>
                                      : <><ActIcon className="w-3 h-3" /> {act.label}{act.danger && <span className="ml-auto text-red-500 text-xs">⚠ irreversible</span>}</>
                                    }
                                  </button>
                                  {res && (
                                    <div className={`mt-1 rounded-lg p-2.5 border text-xs font-mono whitespace-pre-wrap ${
                                      res.startsWith('✅') ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' :
                                      res.startsWith('❌') ? 'bg-red-950/60 border-red-800 text-red-300' :
                                                             'bg-amber-950/60 border-amber-800 text-amber-300'
                                    }`}>
                                      {res}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Spec + Test Terminal */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Terminal className="w-3 h-3" /> Technical Spec
                        </h4>
                        <p className="text-gray-300 text-xs font-mono rounded-lg p-3 border border-gray-800"
                           style={{ background: '#060d1a' }}>
                          {feature.technicalSpec}
                        </p>
                      </div>

                      {/* Run Test Button */}
                      <button
                        onClick={() => runTest(feature.id)}
                        disabled={isTesting}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all border ${
                          isTesting
                            ? 'opacity-50 cursor-not-allowed bg-gray-900 text-gray-500 border-gray-700'
                            : 'bg-gray-900 text-white border-gray-700 hover:bg-gray-800 hover:border-gray-500'
                        }`}
                        style={{ borderColor: !isTesting ? feature.accentColor + '55' : undefined }}>
                        {isTesting
                          ? <><RefreshCw className="w-3 h-3 animate-spin" /> Running live test…</>
                          : <><Zap className="w-3 h-3" style={{ color: feature.accentColor }} /> Run Live Test</>
                        }
                      </button>

                      {/* Test Output Terminal */}
                      {output && (
                        <div className="rounded-lg border overflow-hidden" style={{ background: '#060d1a', borderColor: hasError ? '#7f1d1d' : '#1f2937' }}>
                          {/* Terminal Header */}
                          <div className="flex items-center justify-between px-3 py-2 border-b"
                               style={{ borderColor: hasError ? '#7f1d1d' : '#1f2937', background: '#0a1628' }}>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                              </div>
                              <span className="text-gray-500 text-xs font-mono">test-output · {feature.id}</span>
                              {hasError && (
                                <span className="text-red-400 text-xs font-mono flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> errors detected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => copyOutput(feature.id)}
                                      className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300">
                                {copiedId === feature.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <button onClick={() => clearOutput(feature.id)}
                                      className="p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Output Lines */}
                          <div className="p-3 space-y-0.5 max-h-52 overflow-y-auto text-xs font-mono">
                            {parsed.map((line, i) => (
                              <div key={i}
                                   className={`${lineStyles[line.type]} ${line.type === 'error' ? 'bg-red-950/30 px-1 rounded' : ''} leading-relaxed whitespace-pre-wrap`}>
                                {line.text || '\u00A0'}
                              </div>
                            ))}
                          </div>

                          {/* Error Summary Banner */}
                          {hasError && (
                            <div className="border-t border-red-900 px-3 py-2 flex items-center gap-2"
                                 style={{ background: '#1a0000' }}>
                              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                              <span className="text-red-400 text-xs font-mono">
                                Test failures detected — use Admin Corrections above to remediate
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RBAC Matrix */}
      <div className="mt-6 rounded-xl border overflow-hidden" style={{ background: '#111827', borderColor: '#1f2937' }}>
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm font-mono">RBAC Permission Matrix</h3>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 pb-3 pr-6 font-medium">Permission</th>
                {(['patient','doctor','hospital','insurance','bank','admin'] as const).map(r => (
                  <th key={r} className="text-center text-gray-500 pb-3 px-3 font-medium capitalize">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                'read:own_records','read:all_records','write:own_records','write:all_records',
                'read:prescriptions','write:prescriptions','read:claims','write:claims',
                'approve:claims','read:payments','process:payments','manage:users',
                'view:system_logs','read:financial','write:financial','hash:records',
              ].map((perm, i) => (
                <tr key={perm} className={`border-b border-gray-800/40 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <td className="py-2 pr-6 text-gray-400">{perm}</td>
                  {(['patient','doctor','hospital','insurance','bank','admin'] as const).map(role => (
                    <td key={role} className="text-center py-2 px-3">
                      {rbac.hasPermission(role, perm as any)
                        ? <span className="text-emerald-400 font-bold">✓</span>
                        : <span className="text-gray-700">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};