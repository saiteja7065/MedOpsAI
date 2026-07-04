import { supabase } from '../supabase';
import type { Department } from '../../types';

export const departmentsApi = {
  async getAll() {
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (error) throw error;
    return data as Department[];
  },

  async create(dept: Partial<Department>) {
    const { data, error } = await supabase.from('departments').insert(dept).select().maybeSingle();
    if (error) throw error;
    return data as Department;
  },

  async update(id: string, updates: Partial<Department>) {
    const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Department;
  },

  async remove(id: string) {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
  },
};
