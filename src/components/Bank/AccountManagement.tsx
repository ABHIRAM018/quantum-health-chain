import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Search, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';

interface AccountManagementProps { onBack: () => void; }

interface BankAccount {
  id: string;
  accountNumber: string;
  accountType: string;
  accountHolder: string;
  balance: number;
  status: 'active' | 'suspended' | 'closed';
  entityType: string;
  linkedEntityId: string | null;
}

// snake_case DB row → BankAccount
const mapAccount = (r: any): BankAccount => ({
  id:             r.id,
  accountNumber:  r.account_number   ?? r.accountNumber,
  accountType:    r.account_type     ?? r.accountType,
  accountHolder:  r.account_holder   ?? r.accountHolder,
  balance:        typeof r.balance   === 'string' ? parseFloat(r.balance) : r.balance,
  status:         r.status,
  entityType:     r.entity_type      ?? r.entityType,
  linkedEntityId: r.linked_entity_id ?? r.linkedEntityId ?? null,
});

const authHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const AccountManagement: React.FC<AccountManagementProps> = ({ onBack }) => {
  const [accounts, setAccounts]   = useState<BankAccount[]>([]);
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<BankAccount | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [form, setForm] = useState({
    accountHolder: '', accountType: 'business', entityType: 'hospital', balance: 0,
  });

  // ── Fetch accounts from PostgreSQL ───────────────────────
  const loadAccounts = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/accounts', { headers: authHeader() });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load accounts');
      setAccounts((await res.json()).map(mapAccount));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // ── Create / Update account ──────────────────────────────
  const handleSave = async () => {
    if (!form.accountHolder) return;
    setSaving(true);
    try {
      let res: Response;
      if (editing) {
        res = await fetch(`/api/accounts/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({
            accountHolder: form.accountHolder,
            accountType:   form.accountType,
            entityType:    form.entityType,
            balance:       form.balance,
          }),
        });
      } else {
        res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({
            accountHolder: form.accountHolder,
            accountType:   form.accountType,
            entityType:    form.entityType,
            balance:       form.balance,
          }),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      await loadAccounts();
      setShowForm(false);
      setEditing(null);
      setForm({ accountHolder: '', accountType: 'business', entityType: 'hospital', balance: 0 });
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle status ────────────────────────────────────────
  const toggleStatus = async (acc: BankAccount) => {
    const newStatus = acc.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/accounts/${acc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Status update failed');
      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, status: newStatus } : a));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ── Delete account ───────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this account?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const filtered = accounts.filter(a => {
    if (filterType && a.entityType !== filterType) return false;
    if (search && !a.accountHolder.toLowerCase().includes(search.toLowerCase()) && !a.accountNumber.includes(search)) return false;
    return true;
  });

  const totalBalance = filtered.reduce((s, a) => s + a.balance, 0);
  const active = accounts.filter(a => a.status === 'active').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading accounts...</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowForm(true); setEditing(null); }}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
            <Plus className="w-4 h-4" /> Add Account
          </button>
          <button onClick={onBack} className="text-teal-600 font-medium text-sm">← Back</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Accounts',  value: accounts.length,                   color: 'text-gray-900'  },
          { label: 'Active Accounts', value: active,                             color: 'text-green-600' },
          { label: 'Total Balance',   value: `$${totalBalance.toLocaleString()}`, color: 'text-teal-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit Account' : 'New Account'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Holder</label>
              <input value={form.accountHolder}
                onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
              <select value={form.accountType}
                onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                {['checking', 'savings', 'business', 'escrow'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type</label>
              <select value={form.entityType}
                onChange={e => setForm(f => ({ ...f, entityType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                {['hospital', 'insurance', 'patient', 'doctor', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Opening Balance ($)</label>
              <input type="number" value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
            <option value="">All Types</option>
            {['hospital', 'insurance', 'patient', 'doctor', 'other'].map(t =>
              <option key={t} value={t}>{t}</option>
            )}
          </select>
        </div>
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">No accounts found.</div>
          )}
          {filtered.map(acc => (
            <div key={acc.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{acc.accountHolder}</p>
                  <p className="text-xs text-gray-400">#{acc.accountNumber} · {acc.accountType} · {acc.entityType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">${acc.balance.toLocaleString()}</p>
                </div>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  acc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {acc.status === 'active'
                    ? <CheckCircle className="w-3 h-3" />
                    : <AlertCircle className="w-3 h-3" />}
                  {acc.status}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => {
                    setEditing(acc);
                    setForm({ accountHolder: acc.accountHolder, accountType: acc.accountType, entityType: acc.entityType, balance: acc.balance });
                    setShowForm(true);
                  }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleStatus(acc)}
                    className="p-1.5 text-gray-400 hover:text-amber-600 rounded">
                    {acc.status === 'active'
                      ? <AlertCircle className="w-3.5 h-3.5" />
                      : <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(acc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};