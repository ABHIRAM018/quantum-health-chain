import React, { useState, useEffect } from 'react';
import { Bed, Activity, Search, CheckCircle, XCircle, Clock, Calendar, User, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Patient } from '../../types';

interface HospitalBookingProps { user: Patient; onBack: () => void; }

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('auth_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  pending:   { color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',   icon: Clock        },
  approved:  { color: 'text-green-600',  bg: 'bg-green-50 border-green-200',   icon: CheckCircle  },
  confirmed: { color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',     icon: CheckCircle  },
  completed: { color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     icon: CheckCircle  },
  rejected:  { color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       icon: XCircle      },
  cancelled: { color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-100',     icon: XCircle      },
};

export const HospitalBooking: React.FC<HospitalBookingProps> = ({ user, onBack }) => {
  const [tab, setTab]                 = useState<'browse' | 'mybookings'>('browse');
  const [bookingType, setBookingType] = useState<'room' | 'service'>('room');
  const [hospitals, setHospitals]     = useState<any[]>([]);
  const [rooms, setRooms]             = useState<any[]>([]);
  const [services, setServices]       = useState<any[]>([]);
  const [myRoomBookings, setMyRoomBookings]       = useState<any[]>([]);
  const [myServiceBookings, setMyServiceBookings] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [showModal, setShowModal]     = useState<{ type: 'room' | 'service'; item: any } | null>(null);
  const [form, setForm]               = useState({ checkInDate:'', checkOutDate:'', preferredDate:'', preferredTime:'09:00', reason:'', notes:'' });
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pubRes, rbRes, sbRes] = await Promise.all([
        fetch('/api/hospitals/public', { headers: authHeader() }),
        fetch('/api/room-bookings',    { headers: authHeader() }),
        fetch('/api/service-bookings', { headers: authHeader() }),
      ]);
      if (pubRes.ok) {
        const data = await pubRes.json();
        setHospitals(data.hospitals ?? []);
        setRooms(data.rooms ?? []);
        setServices(data.services ?? []);
      }
      if (rbRes.ok) setMyRoomBookings(await rbRes.json());
      if (sbRes.ok) setMyServiceBookings(await sbRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const hospitalName = (id: string) => hospitals.find(h => h.id === id)?.name ?? id.slice(0,8)+'...';

  const filteredRooms = rooms.filter(r => {
    const hosp = hospitalName(r.hospital_id);
    const matchSearch = r.room_number.toLowerCase().includes(search.toLowerCase()) ||
                        r.room_type.toLowerCase().includes(search.toLowerCase()) ||
                        hosp.toLowerCase().includes(search.toLowerCase());
    const matchHosp = !selectedHospital || r.hospital_id === selectedHospital;
    return matchSearch && matchHosp;
  });

  const filteredServices = services.filter(s => {
    const hosp = hospitalName(s.hospital_id);
    const matchSearch = s.service_name.toLowerCase().includes(search.toLowerCase()) ||
                        s.department.toLowerCase().includes(search.toLowerCase()) ||
                        hosp.toLowerCase().includes(search.toLowerCase());
    const matchHosp = !selectedHospital || s.hospital_id === selectedHospital;
    return matchSearch && matchHosp;
  });

  const bookRoom = async () => {
    if (!showModal || !form.checkInDate || !form.checkOutDate || !form.reason) return;
    setSaving(true);
    try {
      const res = await fetch('/api/room-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          roomId: showModal.item.id,
          hospitalId: showModal.item.hospital_id,
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
          reason: form.reason,
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Room booking request sent!');
      setShowModal(null);
      setForm({ checkInDate:'', checkOutDate:'', preferredDate:'', preferredTime:'09:00', reason:'', notes:'' });
      loadAll();
    } catch (e: any) { showToast('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const bookService = async () => {
    if (!showModal || !form.preferredDate || !form.preferredTime) return;
    setSaving(true);
    try {
      const res = await fetch('/api/service-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          serviceId: showModal.item.id,
          hospitalId: showModal.item.hospital_id,
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          notes: form.notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Service booking request sent!');
      setShowModal(null);
      setForm({ checkInDate:'', checkOutDate:'', preferredDate:'', preferredTime:'09:00', reason:'', notes:'' });
      loadAll();
    } catch (e: any) { showToast('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const cancelRoomBooking = async (id: string) => {
    try {
      await fetch(`/api/room-bookings/${id}/cancel`, { method: 'PATCH', headers: authHeader() });
      showToast('Booking cancelled');
      loadAll();
    } catch (e: any) { showToast('Error: ' + e.message); }
  };

  const cancelServiceBooking = async (id: string) => {
    try {
      await fetch(`/api/service-bookings/${id}/cancel`, { method: 'PATCH', headers: authHeader() });
      showToast('Booking cancelled');
      loadAll();
    } catch (e: any) { showToast('Error: ' + e.message); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 shadow-lg rounded-xl px-5 py-3 text-sm text-gray-800">{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Rooms & Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">Browse and book rooms or services from hospitals</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAll} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={onBack} className="text-blue-600 font-medium text-sm">&#8592; Back</button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('browse')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'browse' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
          Browse & Book
        </button>
        <button onClick={() => setTab('mybookings')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'mybookings' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
          My Bookings ({myRoomBookings.length + myServiceBookings.length})
        </button>
      </div>

      {/* ── BROWSE TAB ─────────────────────────────────────── */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {/* Sub tabs */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
              <button onClick={() => setBookingType('room')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${bookingType === 'room' ? 'bg-violet-600 text-white' : 'text-gray-500'}`}>
                <Bed className="w-4 h-4" /> Rooms ({rooms.length})
              </button>
              <button onClick={() => setBookingType('service')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${bookingType === 'service' ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}>
                <Activity className="w-4 h-4" /> Services ({services.length})
              </button>
            </div>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${bookingType === 'room' ? 'rooms' : 'services'}...`}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <select value={selectedHospital} onChange={e => setSelectedHospital(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
              <option value="">All Hospitals</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bookingType === 'room' ? (
            <>
              {filteredRooms.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <Bed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No available rooms found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredRooms.map(r => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Bed className="w-4 h-4 text-violet-500" />
                            <h3 className="font-bold text-gray-900">Room {r.room_number}</h3>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{hospitalName(r.hospital_id)}</p>
                        </div>
                        <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full capitalize font-medium">{r.room_type}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Floor</p>
                          <p className="font-bold text-gray-900">{r.floor}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Beds Free</p>
                          <p className="font-bold text-green-600">{r.available_beds}/{r.total_beds}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Per Day</p>
                          <p className="font-bold text-blue-600">${r.price_per_day}</p>
                        </div>
                      </div>
                      {(r.amenities ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {(r.amenities ?? []).slice(0,3).map((a: string, i: number) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a}</span>
                          ))}
                          {(r.amenities ?? []).length > 3 && <span className="text-xs text-gray-400">+{r.amenities.length-3}</span>}
                        </div>
                      )}
                      <button onClick={() => r.available_beds > 0 && setShowModal({ type: 'room', item: r })}
                        disabled={r.available_beds <= 0}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                          r.available_beds > 0
                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}>
                        {r.available_beds > 0 ? 'Book This Room' : 'No Beds Available'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {filteredServices.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No services found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredServices.map(s => (
                    <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" />
                            <h3 className="font-bold text-gray-900">{s.service_name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{hospitalName(s.hospital_id)}</p>
                        </div>
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">{s.department}</span>
                      </div>
                      {s.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.description}</p>}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="font-bold text-green-600">${s.base_price}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="font-bold text-blue-600">{s.duration} min</p>
                        </div>
                      </div>
                      <button onClick={() => setShowModal({ type: 'service', item: s })}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                        Book This Service
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MY BOOKINGS TAB ─────────────────────────────────── */}
      {tab === 'mybookings' && (
        <div className="space-y-5">
          {/* Room Bookings */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <Bed className="w-5 h-5 text-violet-500" />
              <h2 className="font-semibold text-gray-900">Room Bookings ({myRoomBookings.length})</h2>
            </div>
            {myRoomBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No room bookings yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myRoomBookings.map(b => {
                  const sc = statusConfig[b.status] ?? statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">Room {b.room_number} <span className="text-gray-400 font-normal capitalize">({b.room_type})</span></p>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" /> {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{b.hospital_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span><Calendar className="w-3 h-3 inline mr-1" />{b.check_in_date?.slice(0,10)} → {b.check_out_date?.slice(0,10)}</span>
                          <span className="font-medium text-gray-700">Total: ${b.total_cost}</span>
                        </div>
                      </div>
                      {(b.status === 'pending' || b.status === 'approved') && (
                        <button onClick={() => cancelRoomBooking(b.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                          Cancel
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Service Bookings */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-gray-900">Service Bookings ({myServiceBookings.length})</h2>
            </div>
            {myServiceBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No service bookings yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myServiceBookings.map(b => {
                  const sc = statusConfig[b.status] ?? statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{b.service_name}</p>
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{b.department}</span>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" /> {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{b.hospital_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span><Calendar className="w-3 h-3 inline mr-1" />{b.preferred_date?.slice(0,10)} at {b.preferred_time}</span>
                          <span className="font-medium text-gray-700">Cost: ${b.total_cost}</span>
                        </div>
                      </div>
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <button onClick={() => cancelServiceBooking(b.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                          Cancel
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOOKING MODAL ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showModal.type === 'room'
                  ? <Bed className="w-5 h-5 text-violet-600" />
                  : <Activity className="w-5 h-5 text-emerald-600" />}
                <h3 className="font-bold text-gray-900">
                  {showModal.type === 'room' ? `Book Room ${showModal.item.room_number}` : `Book ${showModal.item.service_name}`}
                </h3>
              </div>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Item summary */}
            <div className={`mx-5 mt-5 p-3 rounded-lg border ${showModal.type === 'room' ? 'bg-violet-50 border-violet-100' : 'bg-emerald-50 border-emerald-100'}`}>
              {showModal.type === 'room' ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type: <strong className="capitalize">{showModal.item.room_type}</strong></span>
                  <span className="text-gray-600">Floor {showModal.item.floor}</span>
                  <span className="font-bold text-violet-700">${showModal.item.price_per_day}/day</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{showModal.item.department}</span>
                  <span className="text-gray-600">{showModal.item.duration} min</span>
                  <span className="font-bold text-emerald-700">${showModal.item.base_price}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">{hospitalName(showModal.item.hospital_id)}</p>
            </div>

            <div className="p-5 space-y-3">
              {showModal.type === 'room' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Date</label>
                      <input type="date" min={today} value={form.checkInDate}
                        onChange={e => setForm(f => ({...f, checkInDate: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Check-out Date</label>
                      <input type="date" min={form.checkInDate || today} value={form.checkOutDate}
                        onChange={e => setForm(f => ({...f, checkOutDate: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                    </div>
                  </div>
                  {form.checkInDate && form.checkOutDate && (
                    <div className="bg-gray-50 rounded-lg p-2 text-center text-sm">
                      <span className="text-gray-500">Estimated Total: </span>
                      <span className="font-bold text-violet-700">
                        ${(parseFloat(showModal.item.price_per_day) * Math.max(1, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / (1000*60*60*24)))).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason for Admission <span className="text-red-500">*</span></label>
                    <input value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                      placeholder="e.g. Post-surgery recovery"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Date</label>
                      <input type="date" min={today} value={form.preferredDate}
                        onChange={e => setForm(f => ({...f, preferredDate: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Time</label>
                      <input type="time" value={form.preferredTime}
                        onChange={e => setForm(f => ({...f, preferredTime: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  rows={2} placeholder="Any special requirements..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button onClick={() => setShowModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={showModal.type === 'room' ? bookRoom : bookService} disabled={saving}
                className={`flex-1 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 ${
                  showModal.type === 'room' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {saving ? 'Sending...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};