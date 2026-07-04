import { supabase } from '../supabase';
import type { MedicalReport } from '../../types';

export const medicalReportsApi = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase.from('medical_reports').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*))
    `).eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as MedicalReport[];
  },

  async create(report: Partial<MedicalReport>) {
    const { data, error } = await supabase.from('medical_reports').insert(report).select().maybeSingle();
    if (error) throw error;
    return data as MedicalReport;
  },

  async update(id: string, updates: Partial<MedicalReport>) {
    const { data, error } = await supabase.from('medical_reports').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as MedicalReport;
  },

  async remove(id: string) {
    const { error } = await supabase.from('medical_reports').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadFile(file: File, patientId: string) {
    const ext = file.name.split('.').pop();
    const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('medical-reports').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('medical-reports').getPublicUrl(path);
    return urlData.publicUrl;
  },
};
