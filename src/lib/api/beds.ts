import { supabase } from '../supabase';
import type { Bed } from '../../types';

export const bedsApi = {
  async getAll() {
    const { data, error } = await supabase.from('beds').select(`
      *,
      room:rooms(*),
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*))
    `).order('bed_number');
    if (error) throw error;
    return data as Bed[];
  },

  async update(id: string, updates: Partial<Bed>) {
    const { data, error } = await supabase.from('beds').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Bed;
  },

  async create(bed: Partial<Bed>) {
    const { data, error } = await supabase.from('beds').insert(bed).select().maybeSingle();
    if (error) throw error;
    return data as Bed;
  },

  async remove(id: string) {
    const { error } = await supabase.from('beds').delete().eq('id', id);
    if (error) throw error;
  },
};
