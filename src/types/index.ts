export type UserRole = 'admin' | 'doctor' | 'patient';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'missed' | 'rescheduled';
export type AppointmentType = 'in_person' | 'video' | 'emergency';
export type Priority = 'normal' | 'urgent' | 'emergency';

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
export type BedType = 'general' | 'icu' | 'emergency' | 'private' | 'semi_private';

export type OTStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning' | 'emergency';

export type RoomType = 'general' | 'private' | 'icu' | 'emergency' | 'semi_private';

export type NotificationType = 'appointment' | 'video_call' | 'prescription' | 'emergency' | 'system' | 'reminder';

export type VideoSessionStatus = 'scheduled' | 'waiting' | 'active' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  head_doctor_id?: string;
  floor_number: number;
  room_count: number;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Doctor {
  id: string;
  profile_id: string;
  department_id?: string;
  employee_id: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  bio?: string;
  languages: string[];
  available_days: string[];
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  slot_duration_minutes: number;
  max_patients_per_day: number;
  is_available: boolean;
  rating: number;
  total_consultations: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  department?: Department;
}

export interface Patient {
  id: string;
  profile_id: string;
  patient_id: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  allergies?: string[];
  chronic_conditions?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  insurance_expiry?: string;
  is_admitted: boolean;
  admitted_bed_id?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Room {
  id: string;
  room_number: string;
  room_type: RoomType;
  floor_number: number;
  department_id?: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface Bed {
  id: string;
  bed_number: string;
  room_id?: string;
  bed_type: BedType;
  status: BedStatus;
  floor_number: number;
  patient_id?: string;
  admitted_at?: string;
  expected_discharge?: string;
  notes?: string;
  features: string[];
  created_at: string;
  updated_at: string;
  room?: Room;
  patient?: Patient;
}

export interface OperationTheatre {
  id: string;
  ot_number: string;
  name: string;
  department_id?: string;
  status: OTStatus;
  floor_number: number;
  capacity: number;
  features: string[];
  current_doctor_id?: string;
  current_patient_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  surgery_type?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  current_doctor?: Doctor;
}

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  doctor_id: string;
  department_id?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  priority: Priority;
  reason: string;
  symptoms?: string[];
  notes?: string;
  ai_triage_data?: any;
  video_session_id?: string;
  cancelled_by?: string;
  cancelled_reason?: string;
  rescheduled_from?: string;
  fee: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
  department?: Department;
  video_session?: VideoSession;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  doctor_id?: string;
  appointment_id?: string;
  report_type: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  ai_summary?: string;
  ai_diseases?: string[];
  ai_medicines?: string[];
  ai_test_results?: any;
  is_processed: boolean;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Prescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  medicines: Medicine[];
  instructions?: string;
  follow_up_date?: string;
  is_active: boolean;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface ClinicalNote {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  chief_complaint?: string;
  examination_findings?: string;
  diagnosis?: string;
  treatment_plan?: string;
  tests_ordered?: string[];
  notes?: string;
  vitals?: {
    bp?: string;
    heart_rate?: number;
    temperature?: number;
    spo2?: number;
    respiratory_rate?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface VideoSession {
  id: string;
  appointment_id: string;
  room_id: string;
  patient_id: string;
  doctor_id: string;
  status: VideoSessionStatus;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  ai_summary?: string;
  chat_messages: ChatMessage[];
  created_at: string;
}

export interface ChatMessage {
  sender: 'patient' | 'doctor';
  message: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url?: string;
  metadata?: any;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  messages: AIMessage[];
  triage_data?: any;
  session_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface AnalyticsSnapshot {
  id: string;
  snapshot_date: string;
  total_patients: number;
  total_doctors: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  beds_occupied: number;
  beds_available: number;
  ot_utilization: number;
  revenue: number;
  emergency_cases: number;
  video_consultations: number;
  created_at: string;
}

export interface HealthProblem {
  id: string;
  name: string;
  description?: string;
  department_id: string;
  icon: string;
  category: string;
  is_active: boolean;
  created_at: string;
  department?: Department;
}
