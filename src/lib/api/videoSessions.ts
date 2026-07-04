import { supabase } from '../supabase';
import type { VideoSession } from '../../types';

export const videoSessionsApi = {
  async getAll(filters?: { patientId?: string; doctorId?: string; status?: string }) {
    let q = supabase.from('video_sessions').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*))
    `).order('scheduled_at', { ascending: false });
    if (filters?.patientId) q = q.eq('patient_id', filters.patientId);
    if (filters?.doctorId) q = q.eq('doctor_id', filters.doctorId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return data as VideoSession[];
  },

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
