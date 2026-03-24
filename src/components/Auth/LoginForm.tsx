import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Shield, Key, Link, Database, Globe, CheckCircle, XCircle, Loader } from 'lucide-react';
import { authService } from '../../utils/auth';
import { User } from '../../types';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

// Use relative URL so Vite proxy forwards /api/* → http://localhost:4000
const BASE = (import.meta as any).env?.VITE_API_URL || '';

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail]               = useState('john.doe@email.com');
  const [password, setPassword]         = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('online');

  // Check server status on mount and every 8s
  useEffect(() => {
    const check = async () => {
      try {
        await fetch(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ __ping: true }),
          signal: AbortSignal.timeout(4000),
        });
        // Any response (even 400) means server is up
        setServerStatus('online');
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || e?.name === 'TimeoutError') {
          setServerStatus('offline');
        } else {
          setServerStatus('online');
        }
      }
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, []);

  const demoUsers = [
    { email: 'john.doe@email.com',        role: 'Patient',   label: 'john.doe',   color: 'border-sky-300     hover:border-sky-500     hover:bg-sky-50' },
    { email: 'dr.wilson@hospital.com',    role: 'Doctor',    label: 'dr.wilson',  color: 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50' },
    { email: 'admin@cityhospital.com',    role: 'Hospital',  label: 'cityhospital',color: 'border-violet-300  hover:border-violet-500  hover:bg-violet-50' },
    { email: 'claims@healthinsure.com',   role: 'Insurance', label: 'healthinsure',color: 'border-amber-300   hover:border-amber-500   hover:bg-amber-50' },
    { email: 'payments@nationalbank.com', role: 'Bank',      label: 'nationalbank',color: 'border-teal-300    hover:border-teal-500    hover:bg-teal-50' },
    { email: 'admin@healthcare.com',      role: 'Admin',     label: 'admin',      color: 'border-rose-300    hover:border-rose-500    hover:bg-rose-50' },
    { email: 'regulator@gov.health.com',  role: 'Regulator', label: 'regulator',  color: 'border-indigo-300  hover:border-indigo-500  hover:bg-indigo-50' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serverStatus === 'offline') {
      setError('Server is offline. Please start server.js first (node server.js).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await authService.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ServerBadge = () => {
    if (serverStatus === 'checking') return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Loader className="w-3 h-3 animate-spin" />
        Checking server…
      </div>
    );
    if (serverStatus === 'online') return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <CheckCircle className="w-3 h-3" />
        PostgreSQL server online
      </div>
    );
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500">
        <XCircle className="w-3 h-3" />
        Server offline — run <code className="bg-red-50 px-1 rounded">node server.js</code>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center px-12 w-96 border-r border-gray-200 bg-white">
        <div className="mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quantum Health Chain</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            All data stored in PostgreSQL. 6 security layers protect every interaction.
          </p>
          <div className="mt-4">
            <ServerBadge />
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: Globe,    label: 'HTTPS / SSL-TLS',       desc: 'All traffic encrypted in transit',      color: 'text-sky-500',    bg: 'bg-sky-50',    border: 'border-sky-100' },
            { icon: Lock,     label: 'Password Hashing',      desc: 'bcrypt cost-10 with random salt',       color: 'text-purple-500', bg: 'bg-violet-50', border: 'border-violet-100' },
            { icon: Key,      label: 'JWT Authentication',    desc: 'HS256 tokens, 1hr expiry, lockout',     color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100' },
            { icon: Shield,   label: 'RBAC',                  desc: '7 roles × 19 granular permissions',     color: 'text-emerald-500',bg: 'bg-emerald-50',border: 'border-emerald-100' },
            { icon: Link,     label: 'Blockchain Hashing',    desc: 'SHA-256 chain for records & claims',    color: 'text-rose-500',   bg: 'bg-rose-50',   border: 'border-rose-100' },
            { icon: Database, label: 'PostgreSQL Storage',    desc: 'quantum_health_chain — real data only', color: 'text-teal-500',   bg: 'bg-teal-50',   border: 'border-teal-100' },
          ].map(({ icon: Icon, label, desc, color, bg, border }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-lg border ${bg} ${border}`}>
              <Icon className={`w-4 h-4 ${color} shrink-0`} />
              <div>
                <div className="text-gray-800 text-xs font-semibold">{label}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">QUANTUM HEALTHCHAIN</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your portal</p>
            <div className="mt-3 flex justify-center">
              <ServerBadge />
            </div>
          </div>

          {/* Server offline warning */}
          {serverStatus === 'offline' && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <p className="font-semibold mb-1">Backend server is not running</p>
              <p>Open a terminal in your project folder and run:</p>
              <code className="block mt-1 bg-amber-100 rounded px-2 py-1 font-mono">node server.js</code>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || serverStatus === 'offline'}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : serverStatus === 'offline' ? 'Server Offline' : 'Sign In Securely'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <p className="text-xs text-gray-400 mb-3 text-center">
              Demo accounts — password: <span className="font-mono text-gray-600">password123</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {demoUsers.map((u, i) => (
                <button
                  key={i}
                  onClick={() => { setEmail(u.email); setPassword('password123'); setError(''); }}
                  className={`p-2 rounded-lg border bg-white text-left transition-all ${u.color}`}
                >
                  <div className="text-gray-800 text-xs font-medium">{u.role}</div>
                  <div className="text-gray-400 text-xs truncate">{u.label}</div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Protected by HTTPS · JWT · bcrypt · RBAC · Blockchain · PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
};