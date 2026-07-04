import { supabase } from '../supabase';
import type { Doctor } from '../../types';

export const doctorsApi = {
  async getAll(filters?: { department_id?: string; search?: string }) {
    let q = supabase.from('doctors').select(`
      *,
      profile:profiles!doctors_profile_id_fkey(*),
      department:departments(*)
    `).order('created_at', { ascending: false });
    if (filters?.department_id) q = q.eq('department_id', filters.department_id);
    const { data, error } = await q;
    if (error) throw error;
    let doctors = data as Doctor[];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      doctors = doctors.filter(d =>
        d.profile?.full_name?.toLowerCase().includes(s) ||
        d.specialization.toLowerCase().includes(s) ||
        d.employee_id.toLowerCase().includes(s)
      );
    }
    return doctors;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('doctors').select(`
      *,
      profile:profiles!doctors_profile_id_fkey(*),
      department:departments(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async getByProfileId(profileId: string) {
    const { data, error } = await supabase.from('doctors').select(`
      *,
      profile:profiles!doctors_profile_id_fkey(*),
      department:departments(*)
    `).eq('profile_id', profileId).maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async create(doctor: Partial<Doctor>) {
    const { data, error } = await supabase.from('doctors').insert(doctor).select().maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async update(id: string, updates: Partial<Doctor>) {
    const { data, error } = await supabase.from('doctors').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async remove(id: string) {
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) throw error;
  },
};
