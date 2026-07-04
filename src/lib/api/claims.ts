import { supabase } from '../supabase';
import type { Claim, ClaimAuditLog } from '../../types';

export const claimsApi = {
  async getAll(filters?: { status?: string; doctor_id?: string; patient_id?: string }) {
    let q = supabase.from('claims').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*)),
      appointment:appointments(*)
    `).order('created_at', { ascending: false });
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.doctor_id) q = q.eq('doctor_id', filters.doctor_id);
    if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
    const { data, error } = await q;
    if (error) throw error;
    return data as Claim[];
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('claims').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*)),
      appointment:appointments(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Claim;
  },

  async create(claim: Partial<Claim>) {
    const claimNumber = `CLM-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase.from('claims').insert({ ...claim, claim_number: claimNumber, status: 'draft' }).select().maybeSingle();
    if (error) throw error;
    return data as Claim;
  },

  async validate(claimId: string): Promise<Claim> {
    const { data, error } = await supabase.functions.invoke('validate-claim', {
      body: { claim_id: claimId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.claim as Claim;
  },

  async submit(id: string, submittedBy: string) {
    const { data, error } = await supabase.from('claims').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: submittedBy,
    }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Claim;
  },

  async decide(id: string, decision: 'approved' | 'denied', denialReason?: string) {
    const { data, error } = await supabase.from('claims').update({
      status: decision,
      decided_at: new Date().toISOString(),
      denial_reason: decision === 'denied' ? denialReason : null,
    }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Claim;
  },

  async getAuditLog(claimId: string): Promise<ClaimAuditLog[]> {
    const { data, error } = await supabase.from('claim_audit_log').select('*').eq('claim_id', claimId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as ClaimAuditLog[];
  },
};
