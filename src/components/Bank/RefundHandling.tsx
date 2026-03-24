import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Plus, CheckCircle, XCircle, User } from 'lucide-react';
import { Refund, Bank } from '../../types';

interface RefundHandlingProps {
  user: Bank;
  onBack: () => void;
}

const statusConfig: Record<Refund['status'], { bg: string; text: string; border: string }> = {
  requested:  { bg: 'bg-amber-950',  text: 'text-yellow-600', border: 'border-amber-800'  },
  processing: { bg: 'bg-blue-950',   text: 'text-blue-400',   border: 'border-blue-800'   },
  completed:  { bg: 'bg-emerald-950',text: 'text-green-600',  border: 'border-emerald-800'},
  rejected:   { bg: 'bg-red-950',    text: 'text-red-600',    border: 'border-red-800'    },
};

// snake_case DB row → camelCase Refund
const mapRefund = (r: any): Refund => ({
  id:            r.id,
  paymentId:     r.payment_id    ?? r.paymentId,
  patientId:     r.patient_id    ?? r.patientId,
  bankId:        r.bank_id       ?? r.bankId,
  amount:        typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
  reason:        r.reason,
  type:          r.type,
  status:        r.status,
  transactionId: r.transaction_id ?? r.transactionId,
  createdAt:     new Date(r.created_at  ?? r.createdAt),
  processedAt:   r.processed_at || r.processedAt ? new Date(r.processed_at ?? r.processedAt) : undefined,
});

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const RefundHandling: React.FC<RefundHandlingProps> = ({ user, onBack }) => {
  const [refundList, setRefundList]   = useState<Refund[]>([]);
  const [patients, setPatients]       = useState<Record<string, string>>({});
  const [dbPayments, setDbPayments]   = useState<any[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [form, setForm] = useState({
    paymentId: '', patientId: '', amount: '', reason: '', type: 'partial' as Refund['type'],
  });

  // ── Load refunds from PostgreSQL ─────────────────────────
  const loadRefunds = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/refunds', { headers: authHeader() });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load refunds');
      setRefundList((await res.json()).map(mapRefund));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load patients & payments for the "New Refund" form ───
  const loadFormData = useCallback(async () => {
    try {
      const [pRes, pmRes] = await Promise.all([
        fetch('/api/users/role/patient', { headers: authHeader() }),
        fetch('/api/payments',           { headers: authHeader() }),
      ]);
      if (pRes.ok) {
        const data: any[] = await pRes.json();
        const map: Record<string, string> = {};
        data.forEach(u => { map[u.id] = u.name; });
        setPatients(map);
      }
      if (pmRes.ok) {
        const data: any[] = await pmRes.json();
        // Only show payments belonging to this bank that are completed/processed
        setDbPayments(
          data.filter((p: any) =>
            (p.bank_id ?? p.bankId) === user.id &&
            ['processed', 'completed'].includes(p.status)
          )
        );
      }
    } catch { /* non-critical */ }
  }, [user.id]);

  useEffect(() => {
    loadRefunds();
    loadFormData();
  }, [loadRefunds, loadFormData]);

  // ── PATCH helper ─────────────────────────────────────────
  const patchRefund = async (id: string, status: Refund['status'], transactionId?: string) => {
    try {
      const res = await fetch(`/api/refunds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status, transactionId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      const updated = mapRefund(await res.json());
      setRefundList(prev => prev.map(r => r.id === id ? updated : r));
      return updated;
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ── Send DB-persisted notification ─────────────────────
  const notify = (userId: string, title: string, message: string) =>
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ userId, title, message, type: 'payment' }),
    }).catch(() => {});

  const processRefund = async (id: string) => {
    await patchRefund(id, 'processing');
  };

  const completeRefund = async (id: string) => {
    const txnId = `REF-${Date.now()}`;
    const updated = await patchRefund(id, 'completed', txnId);
    if (updated) {
      notify(
        updated.patientId,
        'Refund Processed',
        `Your refund of $${updated.amount} has been successfully processed. Transaction: ${txnId}`,
      );
    }
  };

  const rejectRefund = async (id: string) => {
    const refund = refundList.find(r => r.id === id);
    await patchRefund(id, 'rejected');
    if (refund) {
      notify(
        refund.patientId,
        'Refund Request Update',
        `Your refund request of $${refund.amount} was not approved. Please contact support.`,
      );
    }
  };

  // ── Submit new refund → PostgreSQL ───────────────────────
  const submitRefund = async () => {
    if (!form.paymentId || !form.patientId || !form.amount || !form.reason) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          paymentId: form.paymentId,
          patientId: form.patientId,
          amount:    parseFloat(form.amount),
          reason:    form.reason,
          type:      form.type,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to submit refund');
      await loadRefunds();
      setShowForm(false);
      setForm({ paymentId: '', patientId: '', amount: '', reason: '', type: 'partial' });
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total:       refundList.length,
    pending:     refundList.filter(r => r.status === 'requested').length,
    completed:   refundList.filter(r => r.status === 'completed').length,
    totalAmount: refundList.filter(r => r.status === 'completed').reduce((s, r) => s + r.amount, 0),
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading refunds...</div>
    </div>
  );

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 transition-colors">← Back</button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Refund Management</h1>
            <p className="text-gray-500 text-sm">Process full and partial payment refunds</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Refund
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Refunds',    value: stats.total,                              color: 'text-gray-300'  },
          { label: 'Pending',          value: stats.pending,                            color: 'text-yellow-600'},
          { label: 'Completed',        value: stats.completed,                          color: 'text-green-600' },
          { label: 'Total Refunded',   value: `$${stats.totalAmount.toLocaleString()}`, color: 'text-rose-600'  },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-gray-500 text-xs">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* New Refund Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-gray-900 font-bold text-lg">Initiate Refund</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Payment Reference</label>
                <select value={form.paymentId} onChange={e => setForm(f => ({ ...f, paymentId: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                  <option value="">Select payment...</option>
                  {dbPayments.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.transaction_id || p.id.slice(0, 8)} — ${typeof p.amount === 'string' ? parseFloat(p.amount).toFixed(2) : p.amount}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Patient</label>
                <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                  <option value="">Select patient...</option>
                  {Object.entries(patients).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs font-medium mb-1 block">Refund Amount ($)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-medium mb-1 block">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Refund['type'] }))}
                    className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500">
                    <option value="partial">Partial</option>
                    <option value="full">Full</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Reason</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for refund..."
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none h-20" />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={submitRefund} disabled={submitting}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {refundList.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No refunds processed yet.</p>
          </div>
        )}
        {refundList.map(r => {
          const sc = statusConfig[r.status];
          return (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-900 font-medium text-sm">{patients[r.patientId] || r.patientId}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.text} ${sc.bg} ${sc.border}`}>{r.status}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{r.type}</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{r.reason}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-900 font-bold text-sm">${r.amount}</span>
                {r.status === 'requested' && (
                  <div className="flex gap-2">
                    <button onClick={() => rejectRefund(r.id)}
                      className="text-xs text-red-600 border border-red-900 hover:border-red-700 px-2.5 py-1.5 rounded-lg transition-colors">
                      Reject
                    </button>
                    <button onClick={() => processRefund(r.id)}
                      className="text-xs text-blue-600 border border-blue-900 hover:border-blue-700 px-2.5 py-1.5 rounded-lg transition-colors">
                      Process
                    </button>
                  </div>
                )}
                {r.status === 'processing' && (
                  <button onClick={() => completeRefund(r.id)}
                    className="text-xs text-green-600 border border-emerald-900 hover:border-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors">
                    Complete
                  </button>
                )}
                {r.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {r.status === 'rejected'  && <XCircle    className="w-4 h-4 text-red-600"   />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};