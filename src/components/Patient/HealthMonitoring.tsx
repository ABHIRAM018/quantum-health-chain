import React, { useState, useEffect } from 'react';
import { Activity, Heart, Thermometer, Weight, TrendingUp, Calendar, Plus, AlertTriangle } from 'lucide-react';
import { Patient } from '../../types';
import { api } from '../../utils/api';

interface HealthMonitoringProps {
 user: Patient;
 onBack: () => void;
}

interface HealthMetric {
 id: string;
 type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'blood_sugar';
 value: string;
 unit: string;
 timestamp: Date;
 notes?: string;
}

interface VitalSigns {
 bloodPressure: { systolic: number; diastolic: number };
 heartRate: number;
 temperature: number;
 weight: number;
 bloodSugar: number;
}

export const HealthMonitoring: React.FC<HealthMonitoringProps> = ({ user, onBack }) => {
 const [metrics, setMetrics] = useState<HealthMetric[]>([]);
 const [showAddForm, setShowAddForm] = useState(false);
 const [selectedMetric, setSelectedMetric] = useState<HealthMetric['type']>('blood_pressure');
 const [formData, setFormData] = useState({
 systolic: '',
 diastolic: '',
 heartRate: '',
 temperature: '',
 weight: '',
 bloodSugar: '',
 notes: '',
 });

 useEffect(() => {
 loadHealthMetrics();
 }, [user.id]);

 const loadHealthMetrics = async () => {
 try {
   const data = await api.patients.getHealthMetrics(user.id, user.role);
   setMetrics(data);
 } catch (error) {
   console.error('Error loading health metrics:', error);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 
 let value = '';
 let unit = '';
 
 switch (selectedMetric) {
 case 'blood_pressure':
 value = `${formData.systolic}/${formData.diastolic}`;
 unit = 'mmHg';
 break;
 case 'heart_rate':
 value = formData.heartRate;
 unit = 'bpm';
 break;
 case 'temperature':
 value = formData.temperature;
 unit = '°F';
 break;
 case 'weight':
 value = formData.weight;
 unit = 'lbs';
 break;
 case 'blood_sugar':
 value = formData.bloodSugar;
 unit = 'mg/dL';
 break;
 }

 try {
   await api.patients.addHealthMetric(user.id, {
     type: selectedMetric,
     value,
     unit,
     notes: formData.notes
   });
   
   await loadHealthMetrics();
   setShowAddForm(false);
   resetForm();
   alert('Health metric recorded successfully!');
 } catch (error) {
   console.error('Error adding health metric:', error);
   alert('Failed to record health metric');
 }
 };

 const resetForm = () => {
 setFormData({
 systolic: '',
 diastolic: '',
 heartRate: '',
 temperature: '',
 weight: '',
 bloodSugar: '',
 notes: '',
 });
 };

 const getMetricIcon = (type: HealthMetric['type']) => {
 switch (type) {
 case 'blood_pressure':
 return <Activity className="w-5 h-5" />;
 case 'heart_rate':
 return <Heart className="w-5 h-5" />;
 case 'temperature':
 return <Thermometer className="w-5 h-5" />;
 case 'weight':
 return <Weight className="w-5 h-5" />;
 case 'blood_sugar':
 return <TrendingUp className="w-5 h-5" />;
 default:
 return <Activity className="w-5 h-5" />;
 }
 };

 const getMetricColor = (type: HealthMetric['type']) => {
 switch (type) {
 case 'blood_pressure':
 return 'bg-red-100 text-red-600';
 case 'heart_rate':
 return 'bg-pink-100 text-pink-600';
 case 'temperature':
 return 'bg-orange-100 text-orange-600';
 case 'weight':
 return 'bg-purple-100 text-purple-600';
 case 'blood_sugar':
 return 'bg-green-100 text-green-600';
 default:
 return 'bg-gray-100 text-gray-600';
 }
 };

 const getLatestMetrics = () => {
 const latest: Partial<VitalSigns> = {};
 
 metrics.forEach(metric => {
 if (!latest[metric.type as keyof VitalSigns]) {
 if (metric.type === 'blood_pressure') {
 const [systolic, diastolic] = metric.value.split('/').map(Number);
 latest.bloodPressure = { systolic, diastolic };
 } else {
 (latest as any)[metric.type === 'heart_rate' ? 'heartRate' : 
 metric.type === 'blood_sugar' ? 'bloodSugar' : metric.type] = parseFloat(metric.value);
 }
 }
 });
 
 return latest;
 };

 const latestMetrics = getLatestMetrics();

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Health Monitoring</h1>
 <div className="flex space-x-2">
 <button
 onClick={onBack}
 className="text-blue-600 hover:text-blue-600 font-medium"
 >
 Back to Dashboard
 </button>
 <button
 onClick={() => setShowAddForm(true)}
 className="bg-blue-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
 >
 <Plus className="w-4 h-4" />
 <span>Add Reading</span>
 </button>
 </div>
 </div>

 {/* Current Vitals Overview */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Blood Pressure</p>
 <p className="text-2xl font-bold text-red-600">
 {latestMetrics.bloodPressure ? 
 `${latestMetrics.bloodPressure.systolic}/${latestMetrics.bloodPressure.diastolic}` : 
 '--/--'
 }
 </p>
 <p className="text-xs text-gray-500">mmHg</p>
 </div>
 <div className="p-3 bg-red-100 text-red-600 rounded-full">
 <Activity className="w-6 h-6" />
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Heart Rate</p>
 <p className="text-2xl font-bold text-pink-600">
 {latestMetrics.heartRate || '--'}
 </p>
 <p className="text-xs text-gray-500">bpm</p>
 </div>
 <div className="p-3 bg-pink-100 text-pink-600 rounded-full">
 <Heart className="w-6 h-6" />
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Temperature</p>
 <p className="text-2xl font-bold text-orange-600">
 {latestMetrics.temperature || '--'}
 </p>
 <p className="text-xs text-gray-500">°F</p>
 </div>
 <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
 <Thermometer className="w-6 h-6" />
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Weight</p>
 <p className="text-2xl font-bold text-purple-600">
 {latestMetrics.weight || '--'}
 </p>
 <p className="text-xs text-gray-500">lbs</p>
 </div>
 <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
 <Weight className="w-6 h-6" />
 </div>
 </div>
 </div>
 </div>

 {/* Add Reading Form */}
 {showAddForm && (
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Health Reading</h2>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Metric Type
 </label>
 <select
 value={selectedMetric}
 onChange={(e) => setSelectedMetric(e.target.value as HealthMetric['type'])}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 >
 <option value="blood_pressure">Blood Pressure</option>
 <option value="heart_rate">Heart Rate</option>
 <option value="temperature">Temperature</option>
 <option value="weight">Weight</option>
 <option value="blood_sugar">Blood Sugar</option>
 </select>
 </div>

 {selectedMetric === 'blood_pressure' && (
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Systolic (mmHg)
 </label>
 <input
 type="number"
 value={formData.systolic}
 onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 min="60"
 max="250"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Diastolic (mmHg)
 </label>
 <input
 type="number"
 value={formData.diastolic}
 onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 min="40"
 max="150"
 />
 </div>
 </div>
 )}

 {selectedMetric === 'heart_rate' && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Heart Rate (bpm)
 </label>
 <input
 type="number"
 value={formData.heartRate}
 onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 min="30"
 max="220"
 />
 </div>
 )}

 {selectedMetric === 'temperature' && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Temperature (°F)
 </label>
 <input
 type="number"
 step="0.1"
 value={formData.temperature}
 onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 min="90"
 max="110"
 />
 </div>
 )}

 {selectedMetric === 'weight' && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Weight (lbs)
 </label>
 <input
 type="number"
 step="0.1"
 value={formData.weight}
 onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 min="50"
 max="500"
 />
 </div>
 )}

 {selectedMetric === 'blood_sugar' && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Blood Sugar (mg/dL)
 </label>
 <input
 type="number"
 value={formData.bloodSugar}
 onChange={(e) => setFormData({ ...formData, bloodSugar: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 required
 min="50"
 max="400"
 />
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Notes (Optional)
 </label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
 placeholder="Any additional notes about this reading..."
 />
 </div>

 <div className="flex space-x-4">
 <button
 type="submit"
 className="bg-blue-600 text-gray-900 px-6 py-2 rounded-lg hover:bg-blue-700"
 >
 Save Reading
 </button>
 <button
 type="button"
 onClick={() => setShowAddForm(false)}
 className="bg-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-300"
 >
 Cancel
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Recent Readings */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Recent Readings</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 {metrics.map((metric) => (
 <div key={metric.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
 <div className={`p-3 rounded-full ${getMetricColor(metric.type)}`}>
 {getMetricIcon(metric.type)}
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <h3 className="font-medium text-gray-900 capitalize">
 {metric.type.replace('_', ' ')}
 </h3>
 <span className="text-lg font-bold text-gray-900">
 {metric.value} {metric.unit}
 </span>
 </div>
 <div className="flex items-center space-x-4 mt-1">
 <div className="flex items-center space-x-1 text-sm text-gray-500">
 <Calendar className="w-4 h-4" />
 <span>{new Date(metric.timestamp).toLocaleDateString()}</span>
 <span>{new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 {metric.notes && (
 <span className="text-sm text-gray-500">• {metric.notes}</span>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Health Alerts */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Health Alerts</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-3">
 <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
 <AlertTriangle className="w-5 h-5 text-yellow-600" />
 <div>
 <p className="font-medium text-amber-300">Blood Pressure Reminder</p>
 <p className="text-sm text-yellow-600">It's been 3 days since your last reading</p>
 </div>
 </div>
 <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
 <Heart className="w-5 h-5 text-blue-600" />
 <div>
 <p className="font-medium text-blue-300">Heart Rate Trend</p>
 <p className="text-sm text-blue-600">Your resting heart rate has improved by 5% this month</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};