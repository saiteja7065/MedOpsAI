import { supabase } from '../supabase';
import type { Patient } from '../../types';

export const patientsApi = {
  async getAll(search?: string) {
    let q = supabase.from('patients').select(`
      *,
      profile:profiles!patients_profile_id_fkey(*)
    `).order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    let patients = data as Patient[];
    if (search) {
      const s = search.toLowerCase();
      patients = patients.filter(p =>
        p.profile?.full_name?.toLowerCase().includes(s) ||
        p.patient_id.toLowerCase().includes(s)
      );
    }
    return patients;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('patients').select(`
      *,
      profile:profiles!patients_profile_id_fkey(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Patient;
  },

  async getByProfileId(profileId: string) {
    const { data, error } = await supabase.from('patients').select(`
      *,
      profile:profiles!patients_profile_id_fkey(*)
    `).eq('profile_id', profileId).maybeSingle();
    if (error) throw error;
    return data as Patient;
  },

  async create(patient: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').insert(patient).select().maybeSingle();
    if (error) throw error;
    return data as Patient;
  },

  async update(id: string, updates: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Patient;
  },
};
