import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit3, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { InsurancePolicy, Insurance } from '../../types';
import { api } from '../../utils/api';

interface PolicyManagementProps {
 user: Insurance;
 onBack: () => void;
}

const typeColor: Record<InsurancePolicy['policyType'], string> = {
 basic: 'bg-gray-100 text-gray-500 border-gray-300',
 premium: 'bg-amber-950 text-yellow-600 border-amber-800',
 family: 'bg-blue-950 text-blue-600 border-blue-800',
 senior: 'bg-violet-950 text-purple-600 border-violet-800',
 critical: 'bg-red-950 text-red-600 border-red-800',
};

const emptyPolicy = (): Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt' | 'insuranceId'> => ({
 policyName: '',
 policyType: 'basic',
 coverageAmount: 50000,
 premiumMonthly: 150,
 deductible: 500,
 coveredServices: [],
 networkHospitals: [],
 status: 'active',
});

export const PolicyManagement: React.FC<PolicyManagementProps> = ({ user, onBack }) => {
 const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
 const [showForm, setShowForm] = useState(false);
 const [editId, setEditId] = useState<string | null>(null);
 const [form, setForm] = useState(emptyPolicy());
 const [serviceInput, setServiceInput] = useState('');
 const [_loading, setLoading] = useState(true);

 useEffect(() => {
   loadPolicies();
 }, [user.id]);

 const loadPolicies = async () => {
   try {
     const data = await api.insurance.getPolicies(user.id);
     setPolicies(data);
   } catch (error) {
     console.error('Error loading policies:', error);
   } finally {
     setLoading(false);
   }
 };

 const openCreate = () => { setForm(emptyPolicy()); setEditId(null); setShowForm(true); };
 const openEdit = (p: InsurancePolicy) => {
 setForm({ policyName: p.policyName, policyType: p.policyType, coverageAmount: p.coverageAmount, premiumMonthly: p.premiumMonthly, deductible: p.deductible, coveredServices: [...p.coveredServices], networkHospitals: [...p.networkHospitals], status: p.status });
 setEditId(p.id);
 setShowForm(true);
 };

 const addService = () => {
 if (!serviceInput.trim()) return;
 setForm(f => ({ ...f, coveredServices: [...f.coveredServices, serviceInput.trim()] }));
 setServiceInput('');
 };

 const save = async () => {
 if (!form.policyName) return;
 try {
   if (editId) {
     await api.insurance.updatePolicy(editId, form, user.role);
   } else {
     await api.insurance.createPolicy(form, user.role);
   }
   await loadPolicies();
   setShowForm(false);
 } catch (error) {
   console.error('Error saving policy:', error);
 }
 };

 const deletePolicy = async (id: string) => {
   if (window.confirm('Are you sure?')) {
     try {
       await api.insurance.deletePolicy(id, user.role);
       await loadPolicies();
     } catch (error) {
       console.error('Error deleting policy:', error);
     }
   }
 };

 return (
 <div className="min-h-full bg-gray-50 p-6">
 <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 transition-colors">← Back</button>

 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
 <Shield className="w-5 h-5 text-gray-900" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-gray-900">Policy Management</h1>
 <p className="text-gray-500 text-sm">{policies.filter(p=>p.status==='active').length} active policies</p>
 </div>
 </div>
 <button onClick={openCreate} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
 <Plus className="w-4 h-4" /> New Policy
 </button>
 </div>

 {/* Form Modal */}
 {showForm && (
 <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
 <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg my-4">
 <div className="p-6 border-b border-gray-200">
 <h3 className="text-gray-900 font-bold text-lg">{editId ? 'Edit Policy' : 'Create New Policy'}</h3>
 </div>
 <div className="p-6 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="col-span-2">
 <label className="text-gray-500 text-xs font-medium mb-1 block">Policy Name</label>
 <input value={form.policyName} onChange={e => setForm(f => ({...f, policyName: e.target.value}))}
 className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 placeholder="e.g. Premium Family Shield" />
 </div>
 {[
 { field: 'policyType', label: 'Type', isSelect: true, options: ['basic','premium','family','senior','critical'] },
 { field: 'status', label: 'Status', isSelect: true, options: ['active','inactive'] },
 { field: 'coverageAmount', label: 'Coverage Amount ($)', isSelect: false },
 { field: 'premiumMonthly', label: 'Monthly Premium ($)', isSelect: false },
 { field: 'deductible', label: 'Deductible ($)', isSelect: false },
 ].map(({ field, label, isSelect, options }) => (
 <div key={field}>
 <label className="text-gray-500 text-xs font-medium mb-1 block">{label}</label>
 {isSelect ? (
 <select value={(form as any)[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
 className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent capitalize">
 {options!.map(o => <option key={o} value={o}>{o}</option>)}
 </select>
 ) : (
 <input type="number" value={(form as any)[field]} onChange={e => setForm(f => ({...f, [field]: +e.target.value}))}
 className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
 )}
 </div>
 ))}
 </div>
 <div>
 <label className="text-gray-500 text-xs font-medium mb-1 block">Covered Services</label>
 <div className="flex gap-2 mb-2">
 <input value={serviceInput} onChange={e => setServiceInput(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addService()}
 placeholder="e.g. Emergency Care" className="flex-1 bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
 <button onClick={addService} className="bg-gray-700 hover:bg-gray-600 text-gray-600 px-3 py-2 rounded-lg text-sm transition-colors">Add</button>
 </div>
 <div className="flex flex-wrap gap-2">
 {form.coveredServices.map((s, i) => (
 <span key={i} className="flex items-center gap-1.5 bg-violet-950 text-purple-600 text-xs px-2.5 py-1 rounded-full border border-violet-800">
 {s}
 <button onClick={() => setForm(f => ({...f, coveredServices: f.coveredServices.filter((_,j) => j !== i)}))} className="hover:text-red-600 transition-colors">×</button>
 </span>
 ))}
 </div>
 </div>
 </div>
 <div className="p-6 pt-0 flex gap-3">
 <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 hover:bg-gray-700 text-gray-600 py-2.5 rounded-lg text-sm font-medium transition-colors">Cancel</button>
 <button onClick={save} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
 {editId ? 'Update Policy' : 'Create Policy'}
 </button>
 </div>
 </div>
 </div>
 )}

 <div className="grid md:grid-cols-2 gap-4">
 {policies.length === 0 && (
 <div className="col-span-2 text-center py-12 text-gray-500">
 <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
 <p className="text-sm">No policies yet.</p>
 </div>
 )}
 {policies.map(p => (
 <div key={p.id} className={`bg-white border rounded-xl p-5 ${p.status === 'active' ? 'border-gray-300' : 'border-gray-200 opacity-60'}`}>
 <div className="flex items-start justify-between mb-3">
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-gray-900 font-semibold text-sm">{p.policyName}</h3>
 <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${typeColor[p.policyType]}`}>{p.policyType}</span>
 {p.status === 'active'
 ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Active</span>
 : <span className="flex items-center gap-1 text-xs text-gray-500"><XCircle className="w-3 h-3" /> Inactive</span>}
 </div>
 </div>
 <div className="flex items-center gap-1">
 <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
 <button onClick={() => deletePolicy(p.id)} className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 </div>
 <div className="grid grid-cols-3 gap-3 mb-3">
 <div className="bg-gray-50 rounded-lg p-2.5 text-center">
 <p className="text-gray-500 text-xs">Coverage</p>
 <p className="text-gray-900 font-bold text-sm">${(p.coverageAmount/1000).toFixed(0)}K</p>
 </div>
 <div className="bg-gray-50 rounded-lg p-2.5 text-center">
 <p className="text-gray-500 text-xs">Premium/mo</p>
 <p className="text-green-600 font-bold text-sm">${p.premiumMonthly}</p>
 </div>
 <div className="bg-gray-50 rounded-lg p-2.5 text-center">
 <p className="text-gray-500 text-xs">Deductible</p>
 <p className="text-yellow-600 font-bold text-sm">${p.deductible}</p>
 </div>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {p.coveredServices.slice(0, 4).map((s, i) => (
 <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>
 ))}
 {p.coveredServices.length > 4 && (
 <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{p.coveredServices.length - 4} more</span>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
};