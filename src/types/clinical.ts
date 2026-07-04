import type { Patient, Doctor } from './people';

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

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
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
