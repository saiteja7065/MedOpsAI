import { supabase } from '../supabase';
import type { Appointment } from '../../types';

export const appointmentsApi = {
  async getAll(filters?: {
    patient_id?: string;
    doctor_id?: string;
    status?: string;
    date?: string;
    search?: string;
    includeHistorical?: boolean;
  }) {
    let q = supabase.from('appointments').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*), department:departments(*)),
      department:departments(*),
      video_session:video_sessions(*)
    `).order('appointment_date', { ascending: false });

    if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
    if (filters?.doctor_id) q = q.eq('doctor_id', filters.doctor_id);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.date) q = q.eq('appointment_date', filters.date);
    // APT-HIST-% rows are synthetic daily volume seeded only so the demand
    // forecast has real weekly history to fit a trend to — they aren't real
    // visits and shouldn't clutter appointment lists. The forecast query
    // opts back in with includeHistorical: true.
    if (!filters?.includeHistorical) q = q.not('appointment_number', 'like', 'APT-HIST-%');

    const { data, error } = await q;
    if (error) throw error;
    let appts = data as Appointment[];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      appts = appts.filter(a =>
        a.appointment_number.toLowerCase().includes(s) ||
        a.patient?.profile?.full_name?.toLowerCase().includes(s) ||
        a.doctor?.profile?.full_name?.toLowerCase().includes(s) ||
        a.reason.toLowerCase().includes(s)
      );
    }
    return appts;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('appointments').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*), department:departments(*)),
      department:departments(*),
      video_session:video_sessions(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Appointment;
  },

  async create(appt: Partial<Appointment>) {
    const { data, error } = await supabase.from('appointments').insert(appt).select().maybeSingle();
    if (error) throw error;
    // Fetch with relations for the confirmation screen
    const { data: full } = await supabase.from('appointments').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*), department:departments(*)),
      department:departments(*),
      video_session:video_sessions(*)
    `).eq('id', data.id).maybeSingle();
    return (full || data) as Appointment;
  },

  async update(id: string, updates: Partial<Appointment>) {
    const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Appointment;
  },

  async cancel(id: string, reason: string, cancelledBy: string) {
    return this.update(id, { status: 'cancelled', cancelled_reason: reason, cancelled_by: cancelledBy });
  },
};
