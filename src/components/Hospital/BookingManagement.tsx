import React, { useState, useEffect } from 'react';
import { Bed, Activity, Search, CheckCircle, XCircle, Clock, Calendar, User, RefreshCw, Filter } from 'lucide-react';
import { Hospital } from '../../types';

interface BookingManagementProps { user: Hospital; onBack: () => void; }

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('auth_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const statusConfig: Record<string, { color: string; bg: string }> = {
  pending:   { color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200'  },
  approved:  { color: 'text-green-600',  bg: 'bg-green-50 border-green-200'  },
  confirmed: { color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200'    },
  completed: { color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200'    },
  rejected:  { color: 'text-red-600',    bg: 'bg-red-50 border-red-200'      },
  cancelled: { color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-100'    },
};

export const BookingManagement: React.FC<BookingManagementProps> = ({ user, onBack }) => {
  const [tab, setTab]                 = useState<'rooms' | 'services'>('rooms');
  const [roomBookings, setRoomBookings]       = useState<any[]>([]);
  const [serviceBookings, setServiceBookings] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [saving, setSaving]           = useState<string | null>(null);
  const [toast, setToast]             = useState('');
  const [rejectId, setRejectId]       = useState<{ id: string; type: 'room' | 'service' } | null>(null);
  const [rejectNote, setRejectNote]   = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rbRes, sbRes] = await Promise.all([
        fetch('/api/room-bookings',    { headers: authHeader() }),
        fetch('/api/service-bookings', { headers: authHeader() }),
      ]);
      if (rbRes.ok) setRoomBookings(await rbRes.json());
      if (sbRes.ok) setServiceBookings(await sbRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [user.id]);

  const updateRoomBooking = async (id: string, status: string, notes?: string) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/room-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(`Booking ${status}`);
      setRejectId(null); setRejectNote('');
      loadAll();
    } catch (e: any) { showToast('Error: ' + e.message); }
    finally { setSaving(null); }
  };

  const updateServiceBooking = async (id: string, status: string, notes?: string) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/service-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(`Booking ${status}`);
      setRejectId(null); setRejectNote('');
      loadAll();
    } catch (e: any) { showToast('Error: ' + e.message); }
    finally { setSaving(null); }
  };

  const filtered = (list: any[]) => list.filter(b => {
    const name = b.patient_name ?? '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      (b.room_number ?? b.service_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingRooms    = roomBookings.filter(b => b.status === 'pending').length;
  const pendingServices = serviceBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 shadow-lg rounded-xl px-5 py-3 text-sm text-gray-800">{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Review and manage patient booking requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAll} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={onBack} className="text-violet-600 font-medium text-sm">&#8592; Back</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Room Requests',    value: roomBookings.length,    color: 'text-violet-600' },
          { label: 'Pending Rooms',    value: pendingRooms,           color: 'text-amber-600'  },
          { label: 'Service Requests', value: serviceBookings.length, color: 'text-emerald-600'},
          { label: 'Pending Services', value: pendingServices,        color: 'text-amber-600'  },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          <button onClick={() => setTab('rooms')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'rooms' ? 'bg-violet-600 text-white' : 'text-gray-500'}`}>
            <Bed className="w-4 h-4" /> Rooms
            {pendingRooms > 0 && <span className="bg-white text-violet-700 text-xs px-1.5 rounded-full font-bold">{pendingRooms}</span>}
          </button>
          <button onClick={() => setTab('services')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'services' ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}>
            <Activity className="w-4 h-4" /> Services
            {pendingServices > 0 && <span className="bg-white text-emerald-700 text-xs px-1.5 rounded-full font-bold">{pendingServices}</span>}
          </button>
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient or room/service..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">All Status</option>
          {['pending','approved','confirmed','completed','rejected','cancelled'].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'rooms' ? (
        <div className="space-y-3">
          {filtered(roomBookings).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Bed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No room bookings found</p>
            </div>
          ) : filtered(roomBookings).map(b => {
            const sc = statusConfig[b.status] ?? statusConfig.pending;
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{b.patient_name}</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-violet-700">Room {b.room_number}</span>
                      <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{b.room_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${sc.bg} ${sc.color}`}>{b.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{b.patient_email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span><Calendar className="w-3 h-3 inline mr-1" />{b.check_in_date?.slice(0,10)} → {b.check_out_date?.slice(0,10)}</span>
                      <span className="font-medium">Total: <span className="text-violet-700">${b.total_cost}</span></span>
                    </div>
                    {b.reason && <p className="text-xs text-gray-500 mt-1 italic">Reason: {b.reason}</p>}
                    {b.notes && b.status !== 'pending' && <p className="text-xs text-gray-500 mt-1">Notes: {b.notes}</p>}
                  </div>
                  {b.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => updateRoomBooking(b.id, 'approved')}
                        disabled={saving === b.id}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => setRejectId({ id: b.id, type: 'room' })}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs px-3 py-1.5 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {b.status === 'approved' && (
                    <button onClick={() => updateRoomBooking(b.id, 'completed')}
                      disabled={saving === b.id}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered(serviceBookings).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No service bookings found</p>
            </div>
          ) : filtered(serviceBookings).map(b => {
            const sc = statusConfig[b.status] ?? statusConfig.pending;
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{b.patient_name}</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-emerald-700">{b.service_name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{b.department}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${sc.bg} ${sc.color}`}>{b.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{b.patient_email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span><Calendar className="w-3 h-3 inline mr-1" />{b.preferred_date?.slice(0,10)} at {b.preferred_time}</span>
                      <span><Clock className="w-3 h-3 inline mr-1" />{b.duration} min</span>
                      <span className="font-medium">Cost: <span className="text-emerald-700">${b.total_cost}</span></span>
                    </div>
                    {b.notes && <p className="text-xs text-gray-500 mt-1 italic">Notes: {b.notes}</p>}
                  </div>
                  {b.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => updateServiceBooking(b.id, 'confirmed')}
                        disabled={saving === b.id}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm
                      </button>
                      <button onClick={() => setRejectId({ id: b.id, type: 'service' })}
                        className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs px-3 py-1.5 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateServiceBooking(b.id, 'completed')}
                      disabled={saving === b.id}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-3">Reject Booking</h3>
            <p className="text-gray-500 text-sm mb-4">Please provide a reason for rejection (optional):</p>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              rows={3} placeholder="e.g. Room not available for selected dates..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectNote(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={() => rejectId.type === 'room'
                  ? updateRoomBooking(rejectId.id, 'rejected', rejectNote)
                  : updateServiceBooking(rejectId.id, 'rejected', rejectNote)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};