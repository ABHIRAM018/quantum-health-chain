export type UserRole = 'patient' | 'doctor' | 'hospital' | 'insurance' | 'bank' | 'admin' | 'regulator';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient extends User {
  role: 'patient';
  phone: string;
  dateOfBirth: Date;
  address: string;
  emergencyContact: string;
  insuranceId?: string;
}

export interface Doctor extends User {
  role: 'doctor';
  specialization: string;
  licenseNumber: string;
  hospitalId: string;
  experience: number;
  consultationFee: number;
}

export interface Hospital extends User {
  role: 'hospital';
  address: string;
  phone: string;
  totalBeds: number;
  availableBeds: number;
  services: string[];
}

export interface Insurance extends User {
  role: 'insurance';
  companyName: string;
  policyTypes: string[];
}

export interface Bank extends User {
  role: 'bank';
  bankName: string;
  routingNumber: string;
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

export interface HospitalRoom {
  id: string;
  hospitalId: string;
  roomNumber: string;
  roomType: 'general' | 'private' | 'icu' | 'emergency' | 'surgery';
  totalBeds: number;
  availableBeds: number;
  floor: number;
  status: 'active' | 'maintenance' | 'closed';
  amenities: string[];
  pricePerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HospitalService {
  id: string;
  hospitalId: string;
  serviceName: string;
  description: string;
  department: string;
  basePrice: number;
  isActive: boolean;
  requirements: string[];
  duration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientAdmission {
  id: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
  roomId: string;
  admissionDate: Date;
  dischargeDate?: Date;
  reason: string;
  status: 'admitted' | 'discharged' | 'transferred';
  emergencyContact: string;
  insuranceInfo?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LabReport {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  testType: string;
  testDate: Date;
  results: string;
  normalRange: string;
  status: 'pending' | 'completed' | 'reviewed';
  fileUrl?: string;
  notes: string;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  dateTime: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reason: string;
  diagnosis?: string;
  prescription?: string;
  createdAt: Date;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  attachments: string[];
  createdAt: Date;
}

export interface Bill {
  id: string;
  patientId: string;
  hospitalId: string;
  appointmentId: string;
  amount: number;
  items: BillItem[];
  status: 'pending' | 'submitted' | 'approved' | 'paid';
  createdAt: Date;
}

export interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InsuranceClaim {
  id: string;
  patientId: string;
  billId: string;
  insuranceId: string;
  amount: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  approvalLetter?: string;
  rejectionReason?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  claimId: string;
  bankId: string;
  hospitalId: string;
  amount: number;
  status: 'pending' | 'processed' | 'completed' | 'failed';
  transactionId?: string;
  receipt?: string;
  createdAt: Date;
}

export interface SystemLog {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: Date;
}
// ─── Consent Management ───────────────────────────────────────────────
export interface ConsentRecord {
  id: string;
  patientId: string;
  grantedTo: string;         // userId of doctor / insurance / bank
  grantedToRole: UserRole;
  accessType: 'medical' | 'financial' | 'full';
  status: 'active' | 'revoked' | 'expired';
  validUntil: Date;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Prescriptions ────────────────────────────────────────────────────
export interface PrescriptionMedicine {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  medicines: PrescriptionMedicine[];
  notes: string;
  status: 'active' | 'completed' | 'cancelled';
  refillsAllowed: number;
  refillsUsed: number;
  blockchainHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Security Alerts ─────────────────────────────────────────────────
export interface SecurityAlert {
  id: string;
  userId: string;
  userRole: UserRole;
  alertType: 'failed_login' | 'unauthorized_access' | 'data_breach' | 'suspicious_activity' | 'account_locked';
  alertMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  ipAddress?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

// ─── Notifications ───────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'bill' | 'claim' | 'payment' | 'consent' | 'alert' | 'general';
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

// ─── Medical Loans ────────────────────────────────────────────────────
export interface MedicalLoan {
  id: string;
  patientId: string;
  bankId: string;
  amount: number;
  purpose: string;
  interestRate: number;
  durationMonths: number;
  status: 'pending' | 'approved' | 'rejected' | 'repaying' | 'completed';
  monthlyEmi: number;
  amountPaid: number;
  appliedOn: Date;
  approvedOn?: Date;
  notes?: string;
}

// ─── Insurance Policy ─────────────────────────────────────────────────
export interface InsurancePolicy {
  id: string;
  insuranceId: string;
  policyName: string;
  policyType: 'basic' | 'premium' | 'family' | 'senior' | 'critical';
  coverageAmount: number;
  premiumMonthly: number;
  deductible: number;
  coveredServices: string[];
  networkHospitals: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ─── Refund ───────────────────────────────────────────────────────────
export interface Refund {
  id: string;
  paymentId: string;
  patientId: string;
  bankId: string;
  amount: number;
  reason: string;
  type: 'full' | 'partial';
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  transactionId?: string;
  createdAt: Date;
  processedAt?: Date;
}

// ─── Regulator ────────────────────────────────────────────────────────
export interface Regulator extends User {
  role: 'regulator';
  organization: string;
  jurisdiction: string;
  licenseNumber: string;
}