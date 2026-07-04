import type { Profile } from './auth';
import type { Department } from './hospital';

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
