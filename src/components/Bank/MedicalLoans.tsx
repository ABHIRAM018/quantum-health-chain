import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, CheckCircle, Clock, TrendingUp, User } from 'lucide-react';
import { MedicalLoan, Bank } from '../../types';

interface MedicalLoansProps {
  user: Bank;
  onBack: () => void;
}

const statusConfig: Record<MedicalLoan['status'], { bg: string; text: string; border: string }> = {
  pending:   { bg: 'bg-amber-950',  text: 'text-yellow-600', border: 'border-amber-800'  },
  approved:  { bg: 'bg-emerald-950',text: 'text-green-600',  border: 'border-emerald-800'},
  rejected:  { bg: 'bg-red-950',    text: 'text-red-600',    border: 'border-red-800'    },
  repaying:  { bg: 'bg-blue-950',   text: 'text-blue-400',   border: 'border-blue-800'   },
  completed: { bg: 'bg-gray-800',   text: 'text-gray-400',   border: 'border-gray-300'   },
};

// snake_case DB row → camelCase MedicalLoan
const mapLoan = (r: any): MedicalLoan => ({
  id:              r.id,
  patientId:       r.patient_id      ?? r.patientId,
  bankId:          r.bank_id         ?? r.bankId,
  amount:          typeof r.amount        === 'string' ? parseFloat(r.amount)        : r.amount,
  purpose:         r.purpose,
  interestRate:    typeof r.interest_rate === 'string' ? parseFloat(r.interest_rate) : (r.interest_rate ?? r.interestRate),
  durationMonths:  r.duration_months  ?? r.durationMonths,
  status:          r.status,
  monthlyEmi:      typeof r.monthly_emi  === 'string' ? parseFloat(r.monthly_emi)   : (r.monthly_emi ?? r.monthlyEmi),
  amountPaid:      typeof r.amount_paid  === 'string' ? parseFloat(r.amount_paid)   : (r.amount_paid ?? r.amountPaid ?? 0),
  appliedOn:       new Date(r.applied_on ?? r.appliedOn),
  approvedOn:      r.approved_on || r.approvedOn ? new Date(r.approved_on ?? r.approvedOn) : undefined,
  notes:           r.notes,
});

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const MedicalLoansManagement: React.FC<MedicalLoansProps> = ({ user: _user, onBack }) => {
  const [loans, setLoans]       = useState<MedicalLoan[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<MedicalLoan | null>(null);
  const [filter, setFilter]     = useState<'all' | MedicalLoan['status']>('all');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // ── Fetch loans from PostgreSQL ──────────────────────────
  const loadLoans = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/loans', { headers: authHeader() });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load loans');
      const data: any[] = await res.json();
      setLoans(data.map(mapLoan));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch patient names for display ─────────────────────
  const loadPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/users/role/patient', { headers: authHeader() });
      if (res.ok) {
        const data: any[] = await res.json();
        const map: Record<string, string> = {};
        data.forEach(u => { map[u.id] = u.name; });
        setPatients(map);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadLoans();
    loadPatients();
  }, [loadLoans, loadPatients]);

  // ── PATCH helper → server updates PostgreSQL ────────────
  const patchLoan = async (id: string, status: MedicalLoan['status']) => {
    try {
      const res = await fetch(`/api/loans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      const updated = mapLoan(await res.json());
      setLoans(prev => prev.map(l => l.id === id ? updated : l));
      if (selected?.id === id) setSelected(updated);
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

  const approve = async (id: string) => {
    const updated = await patchLoan(id, 'approved');
    if (updated) {
      notify(
        updated.patientId,
        'Medical Loan Approved',
        `Your medical loan of $${updated.amount.toLocaleString()} has been approved. EMI: $${updated.monthlyEmi}/month.`,
      );
    }
  };

  const reject = async (id: string) => {
    const loan = loans.find(l => l.id === id);
    await patchLoan(id, 'rejected');
    if (loan) {
      notify(
        loan.patientId,
        'Medical Loan Application Update',
        `Your medical loan application of $${loan.amount.toLocaleString()} was not approved at this time.`,
      );
    }
    setSelected(null);
  };

  const activateRepayment = async (id: string) => {
    await patchLoan(id, 'repaying');
  };

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter);

  const stats = {
    total:      loans.length,
    pending:    loans.filter(l => l.status === 'pending').length,
    active:     loans.filter(l => ['approved', 'repaying'].includes(l.status)).length,
    totalValue: loans.reduce((s, l) => s + l.amount, 0),
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading loans...</div>
    </div>
  );

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 transition-colors">← Back</button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-gray-900" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Medical Loans</h1>
          <p className="text-gray-500 text-sm">Review and manage patient loan applications</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Applications', value: stats.total,                         icon: Banknote,      color: 'text-gray-300'  },
          { label: 'Pending Review',     value: stats.pending,                        icon: Clock,         color: 'text-yellow-600'},
          { label: 'Active Loans',       value: stats.active,                         icon: CheckCircle,   color: 'text-green-600' },
          { label: 'Total Value',        value: `$${stats.totalValue.toLocaleString()}`, icon: TrendingUp, color: 'text-teal-600'  },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-gray-500 text-xs">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'pending', 'approved', 'repaying', 'completed', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
              filter === f ? 'bg-teal-100 text-teal-600 border-teal-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>{f}</button>
        ))}
      </div>

      {/* Loan Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900 font-bold">Loan Application</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-900 transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">${selected.amount.toLocaleString()}</span>
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusConfig[selected.status].text} ${statusConfig[selected.status].bg} ${statusConfig[selected.status].border}`}>
                  {selected.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Patient</span>
                  <span className="text-gray-200">{patients[selected.patientId] || selected.patientId}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Purpose</span><span className="text-gray-200 text-right max-w-[60%]">{selected.purpose}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Interest Rate</span><span className="text-gray-200">{selected.interestRate}% p.a.</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Duration</span><span className="text-gray-200">{selected.durationMonths} months</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Monthly EMI</span><span className="text-teal-600 font-semibold">${selected.monthlyEmi}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Applied On</span><span className="text-gray-200">{new Date(selected.appliedOn).toLocaleDateString()}</span>
                </div>
                {selected.approvedOn && (
                  <div className="flex justify-between text-gray-500">
                    <span>Approved On</span><span className="text-gray-200">{new Date(selected.approvedOn).toLocaleDateString()}</span>
                  </div>
                )}
                {selected.status === 'repaying' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Repayment Progress</span>
                      <span>${selected.amountPaid} / ${selected.amount}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-teal-500 rounded-full transition-all"
                        style={{ width: `${Math.min((selected.amountPaid / selected.amount) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              {selected.notes && <p className="text-gray-500 text-xs bg-gray-50 rounded-lg p-3">{selected.notes}</p>}
            </div>
            <div className="p-5 pt-0 flex gap-3">
              {selected.status === 'pending' && (
                <>
                  <button onClick={() => reject(selected.id)}
                    className="flex-1 bg-red-950 hover:bg-red-100 text-red-600 py-2.5 rounded-lg text-sm font-medium transition-colors border border-red-900">
                    Reject
                  </button>
                  <button onClick={() => approve(selected.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Approve
                  </button>
                </>
              )}
              {selected.status === 'approved' && (
                <button onClick={() => activateRepayment(selected.id)}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Activate Repayment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No loan applications.</p>
          </div>
        )}
        {filtered.map(loan => {
          const sc = statusConfig[loan.status];
          return (
            <div key={loan.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => setSelected(loan)}>
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium text-sm">
                    {patients[loan.patientId] || loan.patientId}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.text} ${sc.bg} ${sc.border}`}>
                    {loan.status}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{loan.purpose}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-gray-900 font-bold text-sm">${loan.amount.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">EMI ${loan.monthlyEmi}/mo</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};