import { supabase } from '../supabase';
import type { Profile } from '../../types';

export const profilesApi = {
  async getCurrent(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data as Profile;
  },

  async update(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Profile;
  },

  async getAll() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Profile[];
  },
};
