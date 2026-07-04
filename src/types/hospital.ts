import type { Doctor, Patient } from './people';

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
export type BedType = 'general' | 'icu' | 'emergency' | 'private' | 'semi_private';
export type OTStatus = 'available' | 'occupied' | 'maintenance' | 'cleaning' | 'emergency';
export type RoomType = 'general' | 'private' | 'icu' | 'emergency' | 'semi_private';

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
