import { supabase } from '../supabase';
import type { StaffShift, ShiftStatus, ShiftType } from '../../types';
import type { GeneratedShift } from '../staffScheduling';

export interface NewShift {
  doctor_id: string;
  department_id?: string;
  shift_date: string;
  shift_type: ShiftType;
}

export const staffShiftsApi = {
  async getAll(filters?: { doctorId?: string; startDate?: string; endDate?: string }) {
    let q = supabase.from('staff_shifts').select(`
      *,
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*)),
      department:departments(*)
    `).order('shift_date', { ascending: true });
    if (filters?.doctorId) q = q.eq('doctor_id', filters.doctorId);
    if (filters?.startDate) q = q.gte('shift_date', filters.startDate);
    if (filters?.endDate) q = q.lte('shift_date', filters.endDate);
    const { data, error } = await q;
    if (error) throw error;
    return data as StaffShift[];
  },

  async create(shift: NewShift) {
    const { data, error } = await supabase.from('staff_shifts').insert(shift).select().maybeSingle();
    if (error) throw error;
    return data as StaffShift;
  },

  /** Inserts only the shifts that don't already exist for that doctor/date/type. */
  async bulkCreateMissing(shifts: GeneratedShift[]) {
    if (shifts.length === 0) return [];
    const { data, error } = await supabase.from('staff_shifts')
      .upsert(shifts, { onConflict: 'doctor_id,shift_date,shift_type', ignoreDuplicates: true })
      .select();
    if (error) throw error;
    return data as StaffShift[];
  },

  async updateStatus(id: string, status: ShiftStatus, notes?: string) {
    const { data, error } = await supabase.from('staff_shifts').update({ status, notes }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as StaffShift;
  },

  async remove(id: string) {
    const { error } = await supabase.from('staff_shifts').delete().eq('id', id);
    if (error) throw error;
  },
};
