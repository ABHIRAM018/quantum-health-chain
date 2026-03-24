import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Edit, Filter, Bed, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { api } from '../../utils/api';
import { Hospital, HospitalRoom } from '../../types';

interface RoomManagementProps { user: Hospital; }

const typeColors: Record<string, string> = {
  general:   'bg-blue-50 text-blue-700 border-blue-200',
  private:   'bg-purple-50 text-purple-700 border-purple-200',
  icu:       'bg-red-50 text-red-700 border-red-200',
  emergency: 'bg-orange-50 text-orange-700 border-orange-200',
  surgery:   'bg-teal-50 text-teal-700 border-teal-200',
};

export const RoomManagement: React.FC<RoomManagementProps> = ({ user }) => {
  const [rooms, setRooms]           = useState<HospitalRoom[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingRoom, setEditingRoom] = useState<HospitalRoom | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [amenityInput, setAmenityInput] = useState('');

  const [form, setForm] = useState({
    roomNumber: '', roomType: 'general' as HospitalRoom['roomType'],
    totalBeds: 4, availableBeds: 4, floor: 1,
    status: 'active' as HospitalRoom['status'],
    amenities: [] as string[], pricePerDay: 200,
  });

  const roomTypes    = ['general','private','icu','emergency','surgery'];
  const roomStatuses = ['active','maintenance','closed'];
  const presetAmenities = ['TV','WiFi','Private Bathroom','Refrigerator','Sofa',
    'Ventilator','Cardiac Monitor','Emergency Equipment','Air Conditioning'];

  useEffect(() => { loadRooms(); }, [user.id]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await api.hospitals.getRooms(user.id);
      setRooms(data as any[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ roomNumber:'', roomType:'general', totalBeds:4, availableBeds:4,
              floor:1, status:'active', amenities:[], pricePerDay:200 });
    setEditingRoom(null); setShowForm(true);
  };

  const openEdit = (r: HospitalRoom) => {
    setForm({ roomNumber: r.roomNumber, roomType: r.roomType,
              totalBeds: r.totalBeds, availableBeds: r.availableBeds,
              floor: r.floor, status: r.status,
              amenities: [...(r.amenities ?? [])], pricePerDay: r.pricePerDay ?? 0 });
    setEditingRoom(r); setShowForm(true);
  };

  const save = async () => {
    if (!form.roomNumber) return;
    try {
      if (editingRoom) await api.hospitals.updateRoom(editingRoom.id, form, user.id, user.role);
      else             await api.hospitals.createRoom(form, user.role);
      await loadRooms(); setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this room?')) return;
    try { await api.hospitals.deleteRoom(id, user.id, user.role); await loadRooms(); }
    catch (e) { console.error(e); }
  };

  const toggleAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.includes(a)
      ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const addCustomAmenity = () => {
    if (!amenityInput.trim()) return;
    setForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] }));
    setAmenityInput('');
  };

  const filtered = rooms.filter(r => {
    const matchSearch = r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType   = !filterType   || r.roomType === filterType;
    const matchStatus = !filterStatus || r.status   === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total:       rooms.length,
    active:      rooms.filter(r => r.status === 'active').length,
    totalBeds:   rooms.reduce((s, r) => s + r.totalBeds, 0),
    available:   rooms.reduce((s, r) => s + r.availableBeds, 0),
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Room Management</h2>
            <p className="text-gray-500 text-sm">{stats.active} active · {stats.available}/{stats.totalBeds} beds available</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Rooms',      value: stats.total,     color: 'text-gray-900'    },
          { label: 'Active Rooms',     value: stats.active,    color: 'text-green-600'   },
          { label: 'Total Beds',       value: stats.totalBeds, color: 'text-violet-600'  },
          { label: 'Available Beds',   value: stats.available, color: 'text-blue-600'    },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search room number..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none capitalize">
          <option value="">All Types</option>
          {roomTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">All Status</option>
          {roomStatuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-gray-200">
            <Bed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No rooms found</p>
          </div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900">Room {r.roomNumber}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${typeColors[r.roomType] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {r.roomType}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">Floor {r.floor}</p>
              </div>
              <div className="flex items-center gap-1">
                {r.status === 'active'
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : r.status === 'maintenance'
                  ? <Wrench className="w-4 h-4 text-amber-500" />
                  : <XCircle className="w-4 h-4 text-red-400" />}
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(r.id)}   className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Beds</p>
                <p className="font-bold text-gray-900 text-sm">{r.availableBeds}/{r.totalBeds}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Price/Day</p>
                <p className="font-bold text-green-600 text-sm">${r.pricePerDay}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Status</p>
                <p className={`font-bold text-sm capitalize ${r.status === 'active' ? 'text-green-600' : r.status === 'maintenance' ? 'text-amber-600' : 'text-red-500'}`}>
                  {r.status}
                </p>
              </div>
            </div>

            {(r.amenities ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(r.amenities ?? []).slice(0, 3).map((a, i) => (
                  <span key={i} className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">{a}</span>
                ))}
                {(r.amenities ?? []).length > 3 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{(r.amenities ?? []).length - 3} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Room Number</label>
                  <input value={form.roomNumber} onChange={e => setForm(f => ({...f, roomNumber: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="e.g. 101" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Room Type</label>
                  <select value={form.roomType} onChange={e => setForm(f => ({...f, roomType: e.target.value as any}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 capitalize">
                    {roomTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Beds</label>
                  <input type="number" value={form.totalBeds} min={1}
                    onChange={e => setForm(f => ({...f, totalBeds: +e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Available Beds</label>
                  <input type="number" value={form.availableBeds} min={0} max={form.totalBeds}
                    onChange={e => setForm(f => ({...f, availableBeds: +e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
                  <input type="number" value={form.floor} min={1}
                    onChange={e => setForm(f => ({...f, floor: +e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price per Day ($)</label>
                  <input type="number" value={form.pricePerDay} min={0}
                    onChange={e => setForm(f => ({...f, pricePerDay: +e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as any}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 capitalize">
                    {roomStatuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {presetAmenities.map(a => (
                    <button key={a} onClick={() => toggleAmenity(a)} type="button"
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.amenities.includes(a)
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400'
                      }`}>{a}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={amenityInput} onChange={e => setAmenityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomAmenity()}
                    placeholder="Add custom amenity..."
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                  <button onClick={addCustomAmenity} type="button"
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm">Add</button>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={save}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-sm font-medium">
                {editingRoom ? 'Update Room' : 'Add Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};