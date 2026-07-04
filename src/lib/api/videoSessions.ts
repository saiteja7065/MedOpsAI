import { supabase } from '../supabase';
import type { VideoSession } from '../../types';

export const videoSessionsApi = {
  async getByAppointment(appointmentId: string) {
    const { data, error } = await supabase.from('video_sessions').select('*').eq('appointment_id', appointmentId).maybeSingle();
    if (error) throw error;
    return data as VideoSession | null;
  },

  async create(session: Partial<VideoSession>) {
    const { data, error } = await supabase.from('video_sessions').insert(session).select().maybeSingle();
    if (error) throw error;
    return data as VideoSession;
  },

  async update(id: string, updates: Partial<VideoSession>) {
    const { data, error } = await supabase.from('video_sessions').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as VideoSession;
  },

  async addChatMessage(id: string, message: any) {
    const session = await this.getById(id);
    if (!session) return;
    const messages = [...(session.chat_messages || []), message];
    return this.update(id, { chat_messages: messages });
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('video_sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as VideoSession;
  },
};
