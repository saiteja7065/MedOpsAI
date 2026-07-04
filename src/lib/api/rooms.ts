import { supabase } from '../supabase';

export const roomsApi = {
  async getAll() {
    const { data, error } = await supabase.from('rooms').select('*').order('room_number');
    if (error) throw error;
    return data as any[];
  },
};
