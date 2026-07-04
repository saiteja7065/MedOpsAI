import { supabase } from '../supabase';
import type { CodingSuggestion } from '../../types';

export const codingApi = {
  async suggest(clinicalNoteId: string): Promise<CodingSuggestion> {
    const { data, error } = await supabase.functions.invoke('medical-coding', {
      body: { clinical_note_id: clinicalNoteId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.suggestion as CodingSuggestion;
  },

  async getByAppointment(appointmentId: string): Promise<CodingSuggestion[]> {
    const { data, error } = await supabase.from('coding_suggestions').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as CodingSuggestion[];
  },

  async confirm(id: string, confirmedCodes: CodingSuggestion['suggested_codes'], confirmedBy: string) {
    const { data, error } = await supabase.from('coding_suggestions').update({
      status: 'confirmed',
      confirmed_codes: confirmedCodes,
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
    }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as CodingSuggestion;
  },

  async reject(id: string) {
    const { data, error } = await supabase.from('coding_suggestions').update({ status: 'rejected' }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as CodingSuggestion;
  },
};
