import type { Doctor } from './people';
import type { Department } from './hospital';

export type ShiftType = 'morning' | 'evening' | 'on_call';
export type ShiftStatus = 'scheduled' | 'completed' | 'absent' | 'cancelled';

export interface StaffShift {
  id: string;
  doctor_id: string;
  department_id?: string;
  shift_date: string;
  shift_type: ShiftType;
  status: ShiftStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  department?: Department;
}
