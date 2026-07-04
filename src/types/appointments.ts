import type { Patient, Doctor } from './people';
import type { Department } from './hospital';
import type { VideoSession } from './communication';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'missed' | 'rescheduled';
export type AppointmentType = 'in_person' | 'video' | 'emergency';
export type Priority = 'normal' | 'urgent' | 'emergency';

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
