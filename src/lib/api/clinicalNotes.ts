import { supabase } from '../supabase';
import type { ClinicalNote } from '../../types';

export const clinicalNotesApi = {
  async getByAppointment(appointmentId: string) {
    const { data, error } = await supabase.from('clinical_notes').select('*').eq('appointment_id', appointmentId).maybeSingle();
    if (error) throw error;
    return data as ClinicalNote | null;
  },

  async getByPatient(patientId: string) {
    const { data, error } = await supabase.from('clinical_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as ClinicalNote[];
  },

  async create(note: Partial<ClinicalNote>) {
    const { data, error } = await supabase.from('clinical_notes').insert(note).select().maybeSingle();
    if (error) throw error;
    return data as ClinicalNote;
  },

  async update(id: string, updates: Partial<ClinicalNote>) {
    const { data, error } = await supabase.from('clinical_notes').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as ClinicalNote;
  },
};
