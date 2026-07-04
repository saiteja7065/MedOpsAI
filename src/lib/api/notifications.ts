import { supabase } from '../supabase';
import type { Notification } from '../../types';

export const notificationsApi = {
  async getByUser(userId: string) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as Notification[];
  },

  async create(notification: Partial<Notification>) {
    const { data, error } = await supabase.from('notifications').insert(notification).select().maybeSingle();
    if (error) throw error;
    return data as Notification;
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Notification;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    if (error) throw error;
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
    if (error) throw error;
    return count || 0;
  },
};
