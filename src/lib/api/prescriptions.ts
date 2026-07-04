import { supabase } from '../supabase';
import type { Prescription } from '../../types';

export const prescriptionsApi = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase.from('prescriptions').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*))
    `).eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as Prescription[];
  },

  async getByAppointment(appointmentId: string) {
    const { data, error } = await supabase.from('prescriptions').select('*').eq('appointment_id', appointmentId).maybeSingle();
    if (error) throw error;
    return data as Prescription | null;
  },

  async create(prescription: Partial<Prescription>) {
    const { data, error } = await supabase.from('prescriptions').insert(prescription).select().maybeSingle();
    if (error) throw error;
    return data as Prescription;
  },

  async update(id: string, updates: Partial<Prescription>) {
    const { data, error } = await supabase.from('prescriptions').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Prescription;
  },
};
