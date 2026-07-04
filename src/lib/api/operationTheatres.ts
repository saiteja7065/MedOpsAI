import { supabase } from '../supabase';
import type { OperationTheatre } from '../../types';

export const otsApi = {
  async getAll() {
    const { data, error } = await supabase.from('operation_theatres').select(`
      *,
      department:departments(*),
      current_doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*))
    `).order('ot_number');
    if (error) throw error;
    return data as OperationTheatre[];
  },

  async update(id: string, updates: Partial<OperationTheatre>) {
    const { data, error } = await supabase.from('operation_theatres').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as OperationTheatre;
  },

  async create(ot: Partial<OperationTheatre>) {
    const { data, error } = await supabase.from('operation_theatres').insert(ot).select().maybeSingle();
    if (error) throw error;
    return data as OperationTheatre;
  },
};
