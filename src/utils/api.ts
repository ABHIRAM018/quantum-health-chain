/**
 * api.ts
 * Tries Express/PostgreSQL server first.
 * Falls back to in-memory mock data automatically if server is offline.
 */
import {
  User, Appointment, MedicalRecord, Bill, InsuranceClaim, Payment, SystemLog, UserRole
} from '../types';
import {
  users, appointments, medicalRecords, bills, insuranceClaims, payments, systemLogs,
  hospitalRooms, hospitalServices, patientAdmissions, labReports, insurancePolicies
} from '../data/mockDatabase';
import { rbac, blockchainLedger, dbEncryption, SENSITIVE_FIELDS, passwordHasher } from './security';

const BASE = '';

// ── server availability cache ────────────────────────────────
let _serverUp: boolean | null = null;
async function serverUp(): Promise<boolean> {
  if (_serverUp !== null) return _serverUp;
  try {
    await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ __ping: true }),
      signal: AbortSignal.timeout(2000),
    });
    _serverUp = true;
  } catch {
    _serverUp = false;
    console.warn('🔴 PostgreSQL server offline — running on mock data');
  }
  setTimeout(() => { _serverUp = null; }, 30000);
  return _serverUp;
}

// ── HTTP helpers ─────────────────────────────────────────────
function getToken() { return localStorage.getItem('auth_token'); }

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const GET    = <T>(path: string)                 => http<T>('GET',    path);
const POST   = <T>(path: string, body: unknown)  => http<T>('POST',   path, body);
const PUT    = <T>(path: string, body: unknown)  => http<T>('PUT',    path, body);
const PATCH  = <T>(path: string, body?: unknown) => http<T>('PATCH',  path, body);
const DEL    = <T>(path: string)                 => http<T>('DELETE', path);

// ── helpers ──────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const logActivity = (userId: string, userRole: UserRole, action: string, details: string) => {
  const log: SystemLog = { id: `log-${Date.now()}`, userId, userRole, action, details, timestamp: new Date() };
  systemLogs.unshift(log);
  // Also send to server non-blocking
  POST('/api/logs', log).catch(() => {});
};

const encryptMedicalRecord = async (record: Record<string, unknown>) =>
  dbEncryption.encryptRecord(record, [...SENSITIVE_FIELDS.medicalRecord] as (keyof typeof record)[]);

const chainRecord = async (id: string, payload: Record<string, unknown>, role: UserRole, userId: string) => {
  const record = await blockchainLedger.addRecord(id, payload, role, userId);
  POST('/api/blockchain', {
    recordId: record.id, userId: record.userId, role: record.role,
    data: record.data, previousHash: record.previousHash,
    hash: record.hash, timestamp: record.timestamp,
  }).catch(() => {});
  return record;
};

const guard = (role: UserRole, ...permissions: Parameters<typeof rbac.requirePermission>[1][]) => {
  for (const p of permissions) rbac.requirePermission(role, p);
};

// ── row mapper (snake_case DB → camelCase) ───────────────────
const mapAppt = (r: any): Appointment => ({
  id: r.id, patientId: r.patient_id ?? r.patientId, doctorId: r.doctor_id ?? r.doctorId,
  hospitalId: r.hospital_id ?? r.hospitalId, dateTime: new Date(r.date_time ?? r.dateTime),
  status: r.status, reason: r.reason, diagnosis: r.diagnosis, prescription: r.prescription,
  createdAt: new Date(r.created_at ?? r.createdAt),
});

const mapRecord = (r: any): MedicalRecord => ({
  id: r.id, patientId: r.patient_id ?? r.patientId, doctorId: r.doctor_id ?? r.doctorId,
  appointmentId: r.appointment_id ?? r.appointmentId, diagnosis: r.diagnosis,
  prescription: r.prescription, notes: r.notes, attachments: r.attachments ?? [],
  createdAt: new Date(r.created_at ?? r.createdAt),
});

const mapBill = (r: any): Bill => ({
  id: r.id, patientId: r.patient_id ?? r.patientId, hospitalId: r.hospital_id ?? r.hospitalId,
  appointmentId: r.appointment_id ?? r.appointmentId,
  amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
  status: r.status, createdAt: new Date(r.created_at ?? r.createdAt),
  items: (r.items ?? []).filter((i: any) => i !== null).map((i: any) => ({
    id: i.id, description: i.description, quantity: i.quantity,
    unitPrice: typeof i.unit_price === 'string' ? parseFloat(i.unit_price) : (i.unit_price ?? i.unitPrice),
    total: typeof i.total === 'string' ? parseFloat(i.total) : i.total,
  })),
});

const mapClaim = (r: any): InsuranceClaim => ({
  id: r.id, patientId: r.patient_id ?? r.patientId, billId: r.bill_id ?? r.billId,
  insuranceId: r.insurance_id ?? r.insuranceId,
  amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
  status: r.status, approvalLetter: r.approval_letter ?? r.approvalLetter,
  rejectionReason: r.rejection_reason ?? r.rejectionReason,
  createdAt: new Date(r.created_at ?? r.createdAt),
});

const mapPayment = (r: any): Payment => ({
  id: r.id, claimId: r.claim_id ?? r.claimId, bankId: r.bank_id ?? r.bankId,
  hospitalId: r.hospital_id ?? r.hospitalId,
  amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
  status: r.status, transactionId: r.transaction_id ?? r.transactionId,
  receipt: r.receipt, createdAt: new Date(r.created_at ?? r.createdAt),
});

const mapPrescription = (r: any): any => ({
  id: r.id, patientId: r.patient_id ?? r.patientId, doctorId: r.doctor_id ?? r.doctorId,
  appointmentId: r.appointment_id ?? r.appointmentId, notes: r.notes, status: r.status,
  refillsAllowed: r.refills_allowed ?? r.refillsAllowed,
  createdAt: new Date(r.created_at ?? r.createdAt),
  medicines: (r.medicines ?? []).filter((m: any) => m !== null).map((m: any) => ({
    id: m.id, medicineName: m.medicine_name ?? m.medicineName, dosage: m.dosage,
    frequency: m.frequency, duration: m.duration, instructions: m.instructions
  }))
});

// ═══════════════════════════════════════════════════════════════
export const api = {

  auth: {
    login: async (email: string, password: string) => {
      // Call server login endpoint directly
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
      return res.json();
    },
  },

  // ──────────────────── PATIENTS ────────────────────────────
  patients: {
    getProfile: async (patientId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:own_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/users/role/patient');
        return all.find((u: any) => u.id === patientId);
      }
      await delay(200);
      return users.find(u => u.id === patientId && u.role === 'patient');
    },

    bookAppointment: async (data: Omit<Appointment,'id'|'createdAt'|'status'>, callerRole: UserRole) => {
      guard(callerRole, 'write:own_records');
      if (await serverUp()) {
        return mapAppt(await POST('/api/appointments', {
          doctorId: data.doctorId, hospitalId: data.hospitalId,
          dateTime: data.dateTime, reason: data.reason,
        }));
      }
      await delay(400);
      const appt: Appointment = { ...data, id: `appt-${Date.now()}`, status: 'pending', createdAt: new Date() };
      appointments.push(appt);
      logActivity(data.patientId, 'patient', 'APPOINTMENT_BOOKED', `Booked with doctor ${data.doctorId}`);
      return appt;
    },

    getAppointments: async (patientId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:own_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/appointments');
        return all.filter((a: any) => (a.patient_id ?? a.patientId) === patientId).map(mapAppt);
      }
      await delay(200);
      return appointments.filter(a => a.patientId === patientId);
    },

    getPrescriptions: async (patientId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:prescriptions');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/prescriptions');
        return all.filter((r: any) => (r.patient_id ?? r.patientId) === patientId).map(mapPrescription);
      }
      await delay(200);
      return []; // fallback
    },

    getMedicalRecords: async (patientId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:own_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/medical-records');
        return all.filter((r: any) => (r.patient_id ?? r.patientId) === patientId).map(mapRecord);
      }
      await delay(200);
      return medicalRecords.filter(r => r.patientId === patientId);
    },

    getBills: async (patientId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:own_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/bills');
        return all.filter((b: any) => (b.patient_id ?? b.patientId) === patientId).map(mapBill);
      }
      await delay(200);
      return bills.filter(b => b.patientId === patientId);
    },

    getInsuranceClaims: async (patientId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:claims');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/claims');
        return all.filter((c: any) => (c.patient_id ?? c.patientId) === patientId).map(mapClaim);
      }
      await delay(200);
      return insuranceClaims.filter(c => c.patientId === patientId);
    },

    getHealthMetrics: async (_patientId: string, _callerRole: UserRole) => {
      if (await serverUp()) {
        return GET<any[]>('/api/health-metrics').catch(() => []);
      }
      return [];
    },

    addHealthMetric: async (_patientId: string, data: any) => {
      if (await serverUp()) {
        return POST('/api/health-metrics', data);
      }
      return { id: Date.now(), ...data };
    },

    submitInsuranceClaim: async (data: Omit<InsuranceClaim,'id'|'createdAt'|'status'>, callerRole: UserRole) => {
      guard(callerRole, 'write:claims');
      if (await serverUp()) {
        return mapClaim(await POST('/api/claims', { billId: data.billId, insuranceId: data.insuranceId, amount: data.amount }));
      }
      await delay(400);
      const claim: InsuranceClaim = { ...data, id: `claim-${Date.now()}`, status: 'submitted', createdAt: new Date() };
      insuranceClaims.push(claim);
      logActivity(data.patientId, 'patient', 'CLAIM_SUBMITTED', `Claim for bill ${data.billId}`);
      return claim;
    },
  },

  // ──────────────────── DOCTORS ─────────────────────────────
  doctors: {
    getProfile: async (doctorId: string) => {
      if (await serverUp()) {
        const all = await GET<any[]>('/api/users/role/doctor');
        return all.find((u: any) => u.id === doctorId);
      }
      await delay(200);
      return users.find(u => u.id === doctorId && u.role === 'doctor');
    },

    getAppointments: async (doctorId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:own_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/appointments');
        return all.filter((a: any) => (a.doctor_id ?? a.doctorId) === doctorId).map(mapAppt);
      }
      await delay(200);
      return appointments.filter(a => a.doctorId === doctorId);
    },

    getMedicalRecords: async (doctorId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:own_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/medical-records');
        return all.filter((r: any) => (r.doctor_id ?? r.doctorId) === doctorId).map(mapRecord);
      }
      await delay(200);
      return medicalRecords.filter(r => r.doctorId === doctorId);
    },

    getPrescriptions: async (doctorId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:prescriptions');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/prescriptions');
        return all.filter((r: any) => (r.doctor_id ?? r.doctorId) === doctorId).map(mapPrescription);
      }
      await delay(200);
      return []; // fallback
    },

    createPrescription: async (data: any, callerRole: UserRole) => {
      guard(callerRole, 'write:prescriptions');
      if (await serverUp()) {
        return POST('/api/prescriptions', data);
      }
      return { id: Date.now(), ...data };
    },

    updateAppointmentStatus: async (apptId: string, status: Appointment['status'], doctorId: string, callerRole: UserRole) => {
      guard(callerRole, 'write:own_records');
      if (await serverUp()) {
        return mapAppt(await PATCH(`/api/appointments/${apptId}`, { status }));
      }
      await delay(300);
      const a = appointments.find(a => a.id === apptId);
      if (a) { a.status = status; logActivity(doctorId, 'doctor', 'APPOINTMENT_UPDATED', `Status → ${status}`); }
      return a;
    },

    addMedicalRecord: async (data: Omit<MedicalRecord,'id'|'createdAt'>, callerRole: UserRole) => {
      guard(callerRole, 'read:prescriptions', 'write:prescriptions', 'hash:records');
      if (await serverUp()) {
        const record = mapRecord(await POST('/api/medical-records', {
          patientId: data.patientId, appointmentId: data.appointmentId,
          diagnosis: data.diagnosis, prescription: data.prescription,
          notes: data.notes, attachments: data.attachments || [],
        }));
        await chainRecord(record.id, { ...data }, callerRole, data.doctorId);
        return record;
      }
      await delay(400);
      const record: MedicalRecord = { ...data, id: `rec-${Date.now()}`, createdAt: new Date() };
      const enc = await encryptMedicalRecord(record as unknown as Record<string, unknown>);
      medicalRecords.push(enc as unknown as MedicalRecord);
      await chainRecord(record.id, { ...data }, callerRole, data.doctorId);
      logActivity(data.doctorId, 'doctor', 'MEDICAL_RECORD_ADDED', `For patient ${data.patientId}`);
      return record;
    },

    updateAppointment: async (apptId: string, updates: Partial<Appointment>, doctorId: string, callerRole: UserRole) => {
      guard(callerRole, 'write:own_records');
      if (await serverUp()) {
        return mapAppt(await PATCH(`/api/appointments/${apptId}`, updates));
      }
      await delay(300);
      const a = appointments.find(a => a.id === apptId);
      if (a) { Object.assign(a, updates); logActivity(doctorId, 'doctor', 'APPOINTMENT_UPDATED', apptId); }
      return a;
    },
  },

  // ──────────────────── HOSPITALS ───────────────────────────
  hospitals: {
    getProfile: async (hospitalId: string) => {
      if (await serverUp()) {
        const all = await GET<any[]>('/api/users/role/hospital');
        return all.find((u: any) => u.id === hospitalId);
      }
      return users.find(u => u.id === hospitalId && u.role === 'hospital');
    },

    getDoctors: async (hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:doctors');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/users/role/doctor');
        return all.filter((u: any) => u.hospital_id === hospitalId);
      }
      return users.filter(u => u.role === 'doctor' && (u as any).hospitalId === hospitalId);
    },

    getAppointments: async (hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:all_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/appointments');
        return all.filter((a: any) => (a.hospital_id ?? a.hospitalId) === hospitalId).map(mapAppt);
      }
      return appointments.filter(a => a.hospitalId === hospitalId);
    },

    getMedicalRecords: async (hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:all_records');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/medical-records');
        return all.filter((r: any) => (r.hospital_id ?? r.hospitalId) === hospitalId).map(mapRecord);
      }
      return medicalRecords.filter(r => (r as any).hospitalId === hospitalId);
    },

    createDoctor: async (data: any, hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:doctors');
      if (await serverUp()) return POST('/api/users', { ...data, role: 'doctor' });
      const doc: any = { ...data, id: `doctor-${Date.now()}`, role: 'doctor', hospitalId, password: await passwordHasher.hash(data.password || 'pass123'), createdAt: new Date(), updatedAt: new Date() };
      users.push(doc);
      logActivity(hospitalId, 'hospital', 'DOCTOR_CREATED', doc.name);
      return doc;
    },

    updateDoctor: async (doctorId: string, updates: any, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:doctors');
      if (await serverUp()) return PUT(`/api/users/${doctorId}`, updates);
      const u = users.find(u => u.id === doctorId);
      if (u) Object.assign(u, { ...updates, updatedAt: new Date() });
      return u;
    },

    deleteDoctor: async (doctorId: string, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:doctors');
      if (await serverUp()) { await DEL(`/api/users/${doctorId}`); return true; }
      const i = users.findIndex(u => u.id === doctorId);
      if (i !== -1) { users.splice(i, 1); return true; }
      return false;
    },

    getRooms: async (hospitalId: string) => {
      if (await serverUp()) {
        const res = await GET<any[]>(`/api/hospital/rooms?hospitalId=${hospitalId}`);
        return res.map(r => ({
          ...r,
          roomNumber: r.room_number ?? r.roomNumber,
          roomType: r.room_type ?? r.roomType,
          totalBeds: r.total_beds ?? r.totalBeds,
          availableBeds: r.available_beds ?? r.availableBeds,
          pricePerDay: typeof r.price_per_day === 'string' ? parseFloat(r.price_per_day) : r.price_per_day,
        }));
      }
      return (hospitalRooms as any[]).filter(r => r.hospitalId === hospitalId);
    },

    createRoom: async (data: any, callerRole: UserRole) => {
      guard(callerRole, 'manage:hospital');
      if (await serverUp()) return POST('/api/hospital/rooms', data);
      const r: any = { ...data, id: `room-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
      hospitalRooms.push(r); return r;
    },

    updateRoom: async (roomId: string, updates: any, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:hospital');
      if (await serverUp()) return PUT(`/api/hospital/rooms/${roomId}`, updates);
      const r = hospitalRooms.find(r => r.id === roomId);
      if (r) Object.assign(r, { ...updates, updatedAt: new Date() }); return r;
    },

    deleteRoom: async (roomId: string, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:hospital');
      if (await serverUp()) { await DEL(`/api/hospital/rooms/${roomId}`); return true; }
      const i = hospitalRooms.findIndex(r => r.id === roomId);
      if (i !== -1) { hospitalRooms.splice(i, 1); return true; } return false;
    },

    getServices: async (hospitalId: string) => {
      if (await serverUp()) {
        const res = await GET<any[]>(`/api/hospital/services?hospitalId=${hospitalId}`);
        return res.map(s => ({
          ...s,
          serviceName: s.service_name ?? s.serviceName,
          basePrice: typeof s.base_price === 'string' ? parseFloat(s.base_price) : s.base_price,
          isActive: s.is_active ?? s.isActive,
        }));
      }
      return (hospitalServices as any[]).filter(s => s.hospitalId === hospitalId);
    },

    createService: async (data: any, callerRole: UserRole) => {
      guard(callerRole, 'manage:hospital');
      if (await serverUp()) return POST('/api/hospital/services', data);
      const s: any = { ...data, id: `svc-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
      hospitalServices.push(s); return s;
    },

    updateService: async (serviceId: string, updates: any, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:hospital');
      if (await serverUp()) return PUT(`/api/hospital/services/${serviceId}`, updates);
      const s = hospitalServices.find(s => s.id === serviceId);
      if (s) Object.assign(s, { ...updates, updatedAt: new Date() }); return s;
    },

    deleteService: async (serviceId: string, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:hospital');
      if (await serverUp()) { await DEL(`/api/hospital/services/${serviceId}`); return true; }
      const i = hospitalServices.findIndex(s => s.id === serviceId);
      if (i !== -1) { hospitalServices.splice(i, 1); return true; } return false;
    },

    getPatients: async (callerRole: UserRole) => {
      guard(callerRole, 'read:all_records');
      if (await serverUp()) return GET('/api/users/role/patient');
      return users.filter(u => u.role === 'patient');
    },

    admitPatient: async (data: any, callerRole: UserRole) => {
      guard(callerRole, 'write:all_records', 'hash:records');
      if (await serverUp()) {
        const a = await POST<any>('/api/admissions', data);
        await chainRecord(a.id, data, callerRole, data.hospitalId); return a;
      }
      const a: any = { ...data, id: `adm-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
      patientAdmissions.push(a);
      await chainRecord(a.id, data, callerRole, data.hospitalId);
      const room = hospitalRooms.find(r => r.id === data.roomId);
      if (room && (room as any).availableBeds > 0) (room as any).availableBeds -= 1;
      logActivity(data.hospitalId, 'hospital', 'PATIENT_ADMITTED', data.patientId);
      return a;
    },

    dischargePatient: async (admissionId: string, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'write:all_records');
      if (await serverUp()) return PATCH(`/api/admissions/${admissionId}/discharge`);
      const a = patientAdmissions.find(a => a.id === admissionId);
      if (a) { (a as any).status = 'discharged'; (a as any).dischargeDate = new Date(); }
      return a;
    },

    getAdmissions: async (hospitalId: string) => {
      if (await serverUp()) {
        const res = await GET<any[]>(`/api/admissions?hospitalId=${hospitalId}`);
        return res.map(a => ({
          ...a,
          patientId: a.patient_id ?? a.patientId,
          hospitalId: a.hospital_id ?? a.hospitalId,
          doctorId: a.doctor_id ?? a.doctorId,
          roomId: a.room_id ?? a.roomId,
          admissionDate: new Date(a.admission_date ?? a.admissionDate),
          dischargeDate: a.discharge_date ? new Date(a.discharge_date) : undefined,
          emergencyContact: a.emergency_contact ?? a.emergencyContact,
          insuranceInfo: a.insurance_info ?? a.insuranceInfo,
        }));
      }
      return (patientAdmissions as any[]).filter(a => a.hospitalId === hospitalId);
    },

    createLabReport: async (data: any, callerRole: UserRole) => {
      guard(callerRole, 'write:all_records', 'hash:records');
      if (await serverUp()) {
        const r = await POST<any>('/api/lab-reports', data);
        await chainRecord(r.id, data, callerRole, data.hospitalId); return r;
      }
      const r: any = { ...data, id: `lab-${Date.now()}`, createdAt: new Date() };
      labReports.push(r);
      await chainRecord(r.id, data, callerRole, data.hospitalId);
      logActivity(data.hospitalId, 'hospital', 'LAB_REPORT_CREATED', data.patientId);
      return r;
    },

    getLabReports: async (hospitalId: string) => {
      if (await serverUp()) {
        const res = await GET<any[]>(`/api/lab-reports?hospitalId=${hospitalId}`);
        return res.map(r => ({
          ...r,
          patientId: r.patient_id ?? r.patientId,
          doctorId: r.doctor_id ?? r.doctorId,
          hospitalId: r.hospital_id ?? r.hospitalId,
          testType: r.test_type ?? r.testType,
          normalRange: r.normal_range ?? r.normalRange,
          testDate: new Date(r.test_date ?? r.testDate),
          createdAt: new Date(r.created_at ?? r.createdAt),
        }));
      }
      return (labReports as any[]).filter(r => r.hospitalId === hospitalId);
    },

    updateLabReport: async (reportId: string, updates: any, _hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'write:all_records');
      if (await serverUp()) return PUT(`/api/hospital/lab-reports/${reportId}`, updates);
      const r = labReports.find(r => r.id === reportId);
      if (r) Object.assign(r, { ...updates, updatedAt: new Date() }); return r;
    },

    createBill: async (data: Omit<Bill,'id'|'createdAt'|'status'>, callerRole: UserRole) => {
      guard(callerRole, 'write:financial', 'hash:records');
      if (await serverUp()) {
        const b = mapBill(await POST('/api/bills', data));
        await chainRecord(b.id, data as Record<string, unknown>, callerRole, data.hospitalId); return b;
      }
      const b: Bill = { ...data, id: `bill-${Date.now()}`, status: 'pending', createdAt: new Date() };
      bills.push(b);
      await chainRecord(b.id, data as Record<string, unknown>, callerRole, data.hospitalId);
      logActivity(data.hospitalId, 'hospital', 'BILL_CREATED', `$${data.amount} for ${data.patientId}`);
      return b;
    },

    getBills: async (hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:financial');
      if (await serverUp()) {
        const all = await GET<any[]>('/api/bills');
        return all.filter((b: any) => (b.hospital_id ?? b.hospitalId) === hospitalId).map(mapBill);
      }
      return bills.filter(b => b.hospitalId === hospitalId);
    },

    markBillPaid: async (billId: string, callerRole: UserRole) => {
      guard(callerRole, 'write:financial');
      if (await serverUp()) return PATCH(`/api/bills/${billId}`, { status: 'paid' });
      const b = bills.find(b => b.id === billId);
      if (b) b.status = 'paid'; return b;
    },

    forwardClaim: async (billId: string, hospitalId: string, callerRole: UserRole) => {
      guard(callerRole, 'write:claims', 'hash:records');
      if (await serverUp()) {
        const res = await PATCH<any>(`/api/bills/${billId}/forward`, { insuranceId: 'insurance-1' });
        await chainRecord(res.claim.id, { billId, hospitalId }, callerRole, hospitalId);
        return res;
      }
      const bill = bills.find(b => b.id === billId);
      if (!bill) throw new Error('Bill not found');
      bill.status = 'submitted';
      const claim: InsuranceClaim = { id: `claim-${Date.now()}`, patientId: bill.patientId, billId, insuranceId: 'insurance-1', amount: bill.amount, status: 'submitted', createdAt: new Date() };
      insuranceClaims.push(claim);
      await chainRecord(claim.id, { billId, hospitalId }, callerRole, hospitalId);
      logActivity(hospitalId, 'hospital', 'CLAIM_FORWARDED', billId);
      return { bill, claim };
    },
  },

  // ──────────────────── INSURANCE ───────────────────────────
  insurance: {
    getProfile: async (insuranceId: string) => {
      if (await serverUp()) {
        const all = await GET<any[]>('/api/users/role/insurance');
        return all.find((u: any) => u.id === insuranceId);
      }
      return users.find(u => u.id === insuranceId && u.role === 'insurance');
    },

    getClaims: async (insuranceId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:claims');
      if (await serverUp()) return (await GET<any[]>('/api/claims')).map(mapClaim);
      return insuranceClaims.filter(c => c.insuranceId === insuranceId);
    },

    updateClaimStatus: async (claimId: string, status: InsuranceClaim['status'], _insuranceId: string, callerRole: UserRole, details?: string) => {
      guard(callerRole, 'approve:claims', 'hash:records');
      if (await serverUp()) {
        const c = mapClaim(await PATCH(`/api/claims/${claimId}`, {
          status,
          approvalLetter: status === 'approved' ? details : undefined,
          rejectionReason: status === 'rejected' ? details : undefined,
        }));
        await chainRecord(`${claimId}-${status}`, { claimId, status }, callerRole, _insuranceId);
        return c;
      }
      const claim = insuranceClaims.find(c => c.id === claimId);
      if (claim) {
        claim.status = status;
        if (status === 'approved' && details) claim.approvalLetter = details;
        if (status === 'rejected' && details) claim.rejectionReason = details;
        await chainRecord(`${claimId}-${status}`, { claimId, status }, callerRole, _insuranceId);
        logActivity(_insuranceId, 'insurance', 'CLAIM_UPDATED', `${claimId} → ${status}`);
      }
      return claim;
    },

    sendToBank: async (claimId: string, _insuranceId: string, callerRole: UserRole) => {
      guard(callerRole, 'approve:claims', 'hash:records');
      if (await serverUp()) {
        // Fetch the real bank ID from the DB instead of using the hardcoded mock 'bank-1'
        const banks = await GET<any[]>('/api/users/role/bank').catch(() => []);
        const bankId = banks[0]?.id;
        if (!bankId) throw new Error('No bank registered in the system');
        const p = mapPayment(await POST(`/api/claims/${claimId}/send-to-bank`, { bankId }));
        await chainRecord(p.id, { claimId }, callerRole, _insuranceId);
        return p;
      }
      const claim = insuranceClaims.find(c => c.id === claimId);
      if (!claim || claim.status !== 'approved') throw new Error('Claim must be approved first');
      const bill = bills.find(b => b.id === claim.billId);
      const payment: Payment = { id: `pay-${Date.now()}`, claimId, bankId: 'bank-1', hospitalId: bill?.hospitalId || '', amount: claim.amount, status: 'pending', createdAt: new Date() };
      payments.push(payment);
      await chainRecord(payment.id, { claimId }, callerRole, _insuranceId);
      logActivity(_insuranceId, 'insurance', 'PAYMENT_INITIATED', claimId);
      return payment;
    },

    // ── Policy Management ──────────────────────────────────
    getPolicies: async (insuranceId: string) => {
      const mapPolicy = (r: any) => ({
        id:               r.id,
        insuranceId:      r.insurance_id      ?? r.insuranceId,
        policyName:       r.policy_name       ?? r.policyName       ?? '',
        policyType:       r.policy_type       ?? r.policyType       ?? 'basic',
        coverageAmount:   typeof r.coverage_amount  === 'string' ? parseFloat(r.coverage_amount)  : (r.coverage_amount  ?? r.coverageAmount  ?? 0),
        premiumMonthly:   typeof r.premium_monthly  === 'string' ? parseFloat(r.premium_monthly)  : (r.premium_monthly  ?? r.premiumMonthly  ?? 0),
        deductible:       typeof r.deductible        === 'string' ? parseFloat(r.deductible)       : (r.deductible       ?? 0),
        coveredServices:  Array.isArray(r.covered_services)  ? r.covered_services  : (Array.isArray(r.coveredServices)  ? r.coveredServices  : []),
        networkHospitals: Array.isArray(r.network_hospitals) ? r.network_hospitals : (Array.isArray(r.networkHospitals) ? r.networkHospitals : []),
        status:           r.status ?? 'active',
        createdAt:        new Date(r.created_at ?? r.createdAt ?? Date.now()),
        updatedAt:        new Date(r.updated_at ?? r.updatedAt ?? Date.now()),
      });
      if (await serverUp()) {
        try { return (await GET<any[]>(`/api/policies`)).map(mapPolicy); } catch { /* fallback */ }
      }
      return insurancePolicies.filter((p: any) => p.insuranceId === insuranceId);
    },

    createPolicy: async (data: any, _callerRole: UserRole) => {
      if (await serverUp()) {
        try { return await POST('/api/policies', data); } catch { /* fallback */ }
      }
      const p: any = {
        ...data,
        id: `policy-${Date.now()}`,
        insuranceId: 'insurance-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      insurancePolicies.push(p);
      return p;
    },

    updatePolicy: async (policyId: string, data: any, _callerRole: UserRole) => {
      if (await serverUp()) {
        try { return await PUT(`/api/policies/${policyId}`, data); } catch { /* fallback */ }
      }
      const p = insurancePolicies.find((x: any) => x.id === policyId) as any;
      if (p) Object.assign(p, { ...data, updatedAt: new Date() });
      return p;
    },

    deletePolicy: async (policyId: string, _callerRole: UserRole) => {
      if (await serverUp()) {
        try { await DEL(`/api/policies/${policyId}`); return true; } catch { /* fallback */ }
      }
      const i = insurancePolicies.findIndex((x: any) => x.id === policyId);
      if (i !== -1) insurancePolicies.splice(i, 1);
      return true;
    },

    // ── Analytics ──────────────────────────────────────────
    getAnalytics: async (insuranceId: string, _callerRole: UserRole) => {
      // Try PostgreSQL first via claims endpoint
      const buildAnalytics = (myClaims: any[]) => {
        const approved = myClaims.filter((c: any) => c.status === 'approved');
        const rejected = myClaims.filter((c: any) => c.status === 'rejected');
        const pending  = myClaims.filter((c: any) => ['submitted','under_review'].includes(c.status));
        const totalAmount = myClaims.reduce((s: number, c: any) => s + Number(c.amount), 0);
        const byMonth: Record<string, { claims: number; amount: number }> = {};
        myClaims.forEach((c: any) => {
          const m = new Date(c.createdAt ?? c.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!byMonth[m]) byMonth[m] = { claims: 0, amount: 0 };
          byMonth[m].claims++;
          byMonth[m].amount += Number(c.amount);
        });
        // Group by hospital
        const byHospital: Record<string, { claims: number; amount: number }> = {};
        myClaims.forEach((c: any) => {
          const hId = c.hospitalId ?? c.hospital_id ?? 'Unknown';
          const hosp = users.find(u => u.id === hId);
          const name = hosp?.name ?? hId;
          if (!byHospital[name]) byHospital[name] = { claims: 0, amount: 0 };
          byHospital[name].claims++;
          byHospital[name].amount += Number(c.amount);
        });
        return {
          claimsOverTime: Object.entries(byMonth).map(([month, d]) => ({ month, ...d })),
          claimsByStatus: [
            { status: 'Approved', count: approved.length, percentage: myClaims.length ? Math.round((approved.length/myClaims.length)*100) : 0 },
            { status: 'Rejected', count: rejected.length, percentage: myClaims.length ? Math.round((rejected.length/myClaims.length)*100) : 0 },
            { status: 'Pending',  count: pending.length,  percentage: myClaims.length ? Math.round((pending.length/myClaims.length)*100)  : 0 },
          ],
          topHospitals: Object.entries(byHospital)
            .map(([hospital, d]) => ({ hospital, ...d }))
            .sort((a: any, b: any) => b.amount - a.amount)
            .slice(0, 5),
          averageClaimAmount: myClaims.length ? Math.round(totalAmount / myClaims.length) : 0,
          totalClaims: myClaims.length,
          totalAmount,
          approvalRate: myClaims.length ? Math.round((approved.length / myClaims.length) * 100) : 0,
          processingTime: 3.2,
        };
      };

      if (await serverUp()) {
        try {
          const dbClaims = await GET<any[]>('/api/claims');
          return buildAnalytics(dbClaims.map(mapClaim));
        } catch { /* fallback to mock */ }
      }
      return buildAnalytics(insuranceClaims.filter(c => c.insuranceId === insuranceId));
    },
  },

  // ──────────────────── BANK ────────────────────────────────
  bank: {
    getProfile: async (bankId: string) => {
      if (await serverUp()) {
        const all = await GET<any[]>('/api/users/role/bank');
        return all.find((u: any) => u.id === bankId);
      }
      return users.find(u => u.id === bankId && u.role === 'bank');
    },

    getPayments: async (bankId: string, callerRole: UserRole) => {
      guard(callerRole, 'read:payments');
      if (await serverUp()) return (await GET<any[]>('/api/payments')).map(mapPayment);
      return payments.filter(p => p.bankId === bankId);
    },

    processPayment: async (paymentId: string, _bankId: string, callerRole: UserRole) => {
      guard(callerRole, 'process:payments', 'hash:records');
      if (await serverUp()) {
        const p = mapPayment(await PATCH(`/api/payments/${paymentId}/process`));
        await chainRecord(`${paymentId}-processed`, { paymentId, transactionId: p.transactionId }, callerRole, _bankId);
        return p;
      }
      const p = payments.find(p => p.id === paymentId);
      if (p) {
        p.status = 'processed'; p.transactionId = `TXN-${Date.now()}`;
        await chainRecord(`${paymentId}-processed`, { paymentId, transactionId: p.transactionId }, callerRole, _bankId);
        logActivity(_bankId, 'bank', 'PAYMENT_PROCESSED', paymentId);
      }
      return p;
    },

    completePayment: async (paymentId: string, _bankId: string, callerRole: UserRole) => {
      guard(callerRole, 'process:payments', 'hash:records');
      if (await serverUp()) {
        const p = mapPayment(await PATCH(`/api/payments/${paymentId}/complete`));
        await chainRecord(`${paymentId}-completed`, { paymentId }, callerRole, _bankId);
        return p;
      }
      const p = payments.find(p => p.id === paymentId);
      if (p) {
        p.status = 'completed'; p.receipt = `Payment of $${p.amount} completed successfully`;
        await chainRecord(`${paymentId}-completed`, { paymentId }, callerRole, _bankId);
        logActivity(_bankId, 'bank', 'PAYMENT_COMPLETED', paymentId);
      }
      return p;
    },
  },

  // ──────────────────── ADMIN ───────────────────────────────
  admin: {
    getAllUsers: async (callerRole: UserRole) => {
      guard(callerRole, 'manage:users');
      if (await serverUp()) {
        const rows = await GET<any[]>('/api/users');
        return rows.map((r: any) => ({
          id:        r.id,
          name:      r.name,
          email:     r.email,
          role:      r.role,
          phone:     r.phone,
          address:   r.address,
          createdAt: new Date(r.created_at ?? r.createdAt),
          updatedAt: new Date(r.updated_at ?? r.updatedAt ?? r.created_at),
        }));
      }
      return users;
    },

    getSystemLogs: async (callerRole: UserRole) => {
      guard(callerRole, 'view:system_logs');
      if (await serverUp()) {
        const rows = await GET<any[]>('/api/logs');
        return rows.map((r: any) => ({
          id:        r.id,
          userId:    r.user_id   ?? r.userId,
          userRole:  r.user_role ?? r.userRole,
          action:    r.action,
          details:   r.details,
          timestamp: new Date(r.timestamp ?? r.created_at ?? r.createdAt),
        }));
      }
      return systemLogs;
    },

    getSecurityAlerts: async (callerRole: UserRole) => {
      guard(callerRole, 'view:system_logs');
      if (await serverUp()) {
        const rows = await GET<any[]>('/api/security-alerts').catch(() => []);
        return rows.map((r: any) => ({
          id:           r.id,
          userId:       r.user_id       ?? r.userId       ?? '',
          userRole:     r.user_role     ?? r.userRole     ?? '',
          alertType:    r.alert_type    ?? r.alertType,
          alertMessage: r.alert_message ?? r.alertMessage ?? '',
          severity:     r.severity,
          status:       r.status,
          ipAddress:    r.ip_address    ?? r.ipAddress,
          createdAt:    new Date(r.created_at  ?? r.createdAt),
          resolvedAt:   r.resolved_at || r.resolvedAt
                          ? new Date(r.resolved_at ?? r.resolvedAt) : undefined,
        }));
      }
      return [];
    },

    updateSecurityAlertStatus: async (alertId: string, status: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:settings');
      if (await serverUp()) return PATCH(`/api/security-alerts/${alertId}`, { status });
      return { id: alertId, status };
    },

    getSettings: async () => {
      if (await serverUp()) return GET('/api/admin/settings').catch(() => ({}));
      return {};
    },

    updateSettings: async (settings: any) => {
      if (await serverUp()) return POST('/api/admin/settings', settings);
      return settings;
    },

    getSystemStats: async () => {
      if (await serverUp()) return GET('/api/admin/stats');
      return {
        totalUsers: users.length,
        totalPatients: users.filter(u => u.role === 'patient').length,
        totalDoctors: users.filter(u => u.role === 'doctor').length,
        totalAppointments: appointments.length,
        totalBills: bills.length,
        totalClaims: insuranceClaims.length,
        totalPayments: payments.length,
        recentActivity: systemLogs.slice(0, 10),
        blockchainLength: blockchainLedger.getChainLength(),
      };
    },

    createUser: async (data: Omit<User,'id'|'createdAt'|'updatedAt'>, callerRole: UserRole) => {
      guard(callerRole, 'manage:users');
      if (await serverUp()) return POST('/api/users', data);
      const user: any = { ...data, password: await passwordHasher.hash(data.password), id: `${data.role}-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
      users.push(user); logActivity('admin-1', 'admin', 'USER_CREATED', user.id); return user;
    },

    updateUser: async (userId: string, updates: Partial<User>, callerRole: UserRole) => {
      guard(callerRole, 'manage:users');
      if (await serverUp()) return PUT(`/api/users/${userId}`, updates);
      const u = users.find(u => u.id === userId);
      if (u) Object.assign(u, { ...updates, updatedAt: new Date() }); return u;
    },

    deleteUser: async (userId: string, callerRole: UserRole) => {
      guard(callerRole, 'manage:users');
      if (await serverUp()) { await DEL(`/api/users/${userId}`); return true; }
      const i = users.findIndex(u => u.id === userId);
      if (i !== -1) { users.splice(i, 1); return true; } return false;
    },

    verifyBlockchain: async (callerRole: UserRole) => {
      guard(callerRole, 'view:system_logs');
      return blockchainLedger.verifyChain();
    },

    getBlockchainRecords: (callerRole: UserRole) => {
      guard(callerRole, 'view:system_logs');
      return blockchainLedger.getChain();
    },
  },
};