import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Edit, Activity, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { Hospital, HospitalService } from '../../types';

interface ServiceManagementProps { user: Hospital; }

const deptColors: Record<string, string> = {
  Emergency:    'bg-red-50 text-red-700 border-red-200',
  Cardiology:   'bg-pink-50 text-pink-700 border-pink-200',
  Orthopedics:  'bg-blue-50 text-blue-700 border-blue-200',
  Radiology:    'bg-cyan-50 text-cyan-700 border-cyan-200',
  Laboratory:   'bg-green-50 text-green-700 border-green-200',
  Surgery:      'bg-orange-50 text-orange-700 border-orange-200',
  Pediatrics:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  Neurology:    'bg-purple-50 text-purple-700 border-purple-200',
  Oncology:     'bg-rose-50 text-rose-700 border-rose-200',
  Dermatology:  'bg-amber-50 text-amber-700 border-amber-200',
  General:      'bg-gray-50 text-gray-700 border-gray-200',
};

export const ServiceManagement: React.FC<ServiceManagementProps> = ({ user }) => {
  const [services, setServices]         = useState<HospitalService[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editingService, setEditingService] = useState<HospitalService | null>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    serviceName: '', description: '', department: 'General',
    basePrice: 100, isActive: true,
    requirements: [] as string[], duration: 30,
  });

  const departments = ['Emergency','Cardiology','Orthopedics','Radiology','Laboratory',
    'Surgery','Pediatrics','Neurology','Oncology','Dermatology','General','Pathology'];
  const presetRequirements = ['Valid ID','Insurance Card','Doctor Referral','Fasting Required',
    'Pre-operative Tests','Insurance Pre-approval','No Metal Implants','Medical History',
    'Emergency Contact','Consent Form'];

  useEffect(() => { loadServices(); }, [user.id]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await api.hospitals.getServices(user.id);
      setServices(data as any[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ serviceName:'', description:'', department:'General',
              basePrice:100, isActive:true, requirements:[], duration:30 });
    setEditingService(null); setShowForm(true);
  };

  const openEdit = (s: HospitalService) => {
    setForm({ serviceName: s.serviceName, description: s.description ?? '',
              department: s.department, basePrice: s.basePrice,
              isActive: s.isActive, requirements: [...(s.requirements ?? [])],
              duration: s.duration ?? 30 });
    setEditingService(s); setShowForm(true);
  };

  const save = async () => {
    if (!form.serviceName || !form.department) return;
    try {
      if (editingService) await api.hospitals.updateService(editingService.id, form, user.id, user.role);
      else                await api.hospitals.createService(form, user.role);
      await loadServices(); setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete this service?')) return;
    try { await api.hospitals.deleteService(id, user.id, user.role); await loadServices(); }
    catch (e) { console.error(e); }
  };

  const toggleReq = (r: string) =>
    setForm(f => ({ ...f, requirements: f.requirements.includes(r)
      ? f.requirements.filter(x => x !== r) : [...f.requirements, r] }));

  const filtered = services.filter(s => {
    const matchSearch = s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept   = !filterDept   || s.department === filterDept;
    const matchStatus = !filterStatus || (filterStatus === 'active' ? s.isActive : !s.isActive);
    return matchSearch && matchDept && matchStatus;
  });

  const stats = {
    total:   services.length,
    active:  services.filter(s => s.isActive).length,
    avgPrice: services.length
      ? Math.round(services.reduce((s, x) => s + x.basePrice, 0) / services.length)
      : 0,
    depts: new Set(services.map(s => s.department)).size,
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Service Management</h2>
            <p className="text-gray-500 text-sm">{stats.active} active · {stats.depts} departments</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Services',  value: stats.total,            color: 'text-gray-900'   },
          { label: 'Active Services', value: stats.active,           color: 'text-green-600'  },
          { label: 'Avg Price',       value: `$${stats.avgPrice}`,   color: 'text-emerald-600'},
          { label: 'Departments',     value: stats.depts,            color: 'text-blue-600'   },
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
            placeholder="Search services..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-gray-200">
            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No services found</p>
          </div>
        )}
        {filtered.map(s => (
          <div key={s.id} className={`bg-white border rounded-xl p-5 hover:shadow-sm transition-shadow ${s.isActive ? 'border-gray-200' : 'border-gray-100 opacity-70'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 truncate">{s.serviceName}</h3>
                  {s.isActive
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <XCircle    className="w-4 h-4 text-red-400   shrink-0" />}
                </div>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium mt-1 ${deptColors[s.department] ?? deptColors.General}`}>
                  {s.department}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(s.id)}   className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {s.description && (
              <p className="text-gray-500 text-xs mb-3 line-clamp-2">{s.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-bold text-green-600 text-sm">${s.basePrice}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-bold text-blue-600 text-sm">{s.duration ?? 30} min</p>
                </div>
              </div>
            </div>

            {(s.requirements ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(s.requirements ?? []).slice(0, 2).map((r, i) => (
                  <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{r}</span>
                ))}
                {(s.requirements ?? []).length > 2 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{(s.requirements ?? []).length - 2}</span>
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
              <h3 className="font-bold text-gray-900 text-lg">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Service Name</label>
                  <input value={form.serviceName} onChange={e => setForm(f => ({...f, serviceName: e.target.value}))}
                    placeholder="e.g. Blood Test"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                    rows={2} placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Base Price ($)</label>
                  <input type="number" value={form.basePrice} min={0}
                    onChange={e => setForm(f => ({...f, basePrice: +e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                  <input type="number" value={form.duration} min={5}
                    onChange={e => setForm(f => ({...f, duration: +e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="block text-xs font-medium text-gray-600">Active</label>
                  <button type="button" onClick={() => setForm(f => ({...f, isActive: !f.isActive}))}
                    className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Requirements</label>
                <div className="flex flex-wrap gap-2">
                  {presetRequirements.map(r => (
                    <button key={r} onClick={() => toggleReq(r)} type="button"
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.requirements.includes(r)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={save}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium">
                {editingService ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};