import { supabase } from '../supabase';
import type { AnalyticsSnapshot } from '../../types';

export const analyticsApi = {
  async getSnapshots() {
    const { data, error } = await supabase.from('analytics_snapshots').select('*').order('snapshot_date', { ascending: false }).limit(30);
    if (error) throw error;
    return data as AnalyticsSnapshot[];
  },

  async getDashboardStats() {
    const [patients, doctors, beds, ots, appts] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('doctors').select('*', { count: 'exact', head: true }),
      supabase.from('beds').select('status'),
      supabase.from('operation_theatres').select('status'),
      supabase.from('appointments').select('status, type, appointment_date, fee'),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayAppts = (appts.data || []).filter((a: any) => a.appointment_date === today);
    const completedAppts = (appts.data || []).filter((a: any) => a.status === 'completed');
    const emergencyAppts = (appts.data || []).filter((a: any) => a.type === 'emergency' || a.priority === 'emergency');
    const videoAppts = (appts.data || []).filter((a: any) => a.type === 'video');
    const revenue = completedAppts.reduce((sum: number, a: any) => sum + Number(a.fee || 0), 0);

    const bedsData = beds.data || [];
    const bedsAvailable = bedsData.filter((b: any) => b.status === 'available').length;
    const bedsOccupied = bedsData.filter((b: any) => b.status === 'occupied').length;

    const otsData = ots.data || [];
    const otsAvailable = otsData.filter((o: any) => o.status === 'available').length;
    const otsOccupied = otsData.filter((o: any) => o.status === 'occupied').length;

    return {
      totalPatients: patients.count || 0,
      totalDoctors: doctors.count || 0,
      todayAppointments: todayAppts.length,
      bedsAvailable,
      bedsOccupied,
      totalBeds: bedsData.length,
      otsAvailable,
      otsOccupied,
      totalOTs: otsData.length,
      totalAppointments: (appts.data || []).length,
      completedAppointments: completedAppts.length,
      emergencyCases: emergencyAppts.length,
      videoConsultations: videoAppts.length,
      revenue,
      pendingAppointments: (appts.data || []).filter((a: any) => a.status === 'pending').length,
    };
  },
};
