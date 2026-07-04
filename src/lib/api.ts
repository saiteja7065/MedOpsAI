import { supabase } from './supabase';
import type {
  Appointment, Bed, Doctor, Patient, Department, OperationTheatre,
  MedicalReport, Prescription, ClinicalNote, VideoSession, Notification,
  Profile, AnalyticsSnapshot, HealthProblem
} from '../types';

// ============ PROFILES ============
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

// ============ DEPARTMENTS ============
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

// ============ DOCTORS ============
export const doctorsApi = {
  async getAll(filters?: { department_id?: string; search?: string }) {
    let q = supabase.from('doctors').select(`
      *,
      profile:profiles!doctors_profile_id_fkey(*),
      department:departments(*)
    `).order('created_at', { ascending: false });
    if (filters?.department_id) q = q.eq('department_id', filters.department_id);
    const { data, error } = await q;
    if (error) throw error;
    let doctors = data as Doctor[];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      doctors = doctors.filter(d =>
        d.profile?.full_name?.toLowerCase().includes(s) ||
        d.specialization.toLowerCase().includes(s) ||
        d.employee_id.toLowerCase().includes(s)
      );
    }
    return doctors;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('doctors').select(`
      *,
      profile:profiles!doctors_profile_id_fkey(*),
      department:departments(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async getByProfileId(profileId: string) {
    const { data, error } = await supabase.from('doctors').select(`
      *,
      profile:profiles!doctors_profile_id_fkey(*),
      department:departments(*)
    `).eq('profile_id', profileId).maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async create(doctor: Partial<Doctor>) {
    const { data, error } = await supabase.from('doctors').insert(doctor).select().maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async update(id: string, updates: Partial<Doctor>) {
    const { data, error } = await supabase.from('doctors').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Doctor;
  },

  async remove(id: string) {
    const { error } = await supabase.from('doctors').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ PATIENTS ============
export const patientsApi = {
  async getAll(search?: string) {
    let q = supabase.from('patients').select(`
      *,
      profile:profiles!patients_profile_id_fkey(*)
    `).order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    let patients = data as Patient[];
    if (search) {
      const s = search.toLowerCase();
      patients = patients.filter(p =>
        p.profile?.full_name?.toLowerCase().includes(s) ||
        p.patient_id.toLowerCase().includes(s)
      );
    }
    return patients;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('patients').select(`
      *,
      profile:profiles!patients_profile_id_fkey(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Patient;
  },

  async getByProfileId(profileId: string) {
    const { data, error } = await supabase.from('patients').select(`
      *,
      profile:profiles!patients_profile_id_fkey(*)
    `).eq('profile_id', profileId).maybeSingle();
    if (error) throw error;
    return data as Patient;
  },

  async create(patient: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').insert(patient).select().maybeSingle();
    if (error) throw error;
    return data as Patient;
  },

  async update(id: string, updates: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Patient;
  },
};

// ============ BEDS ============
export const bedsApi = {
  async getAll() {
    const { data, error } = await supabase.from('beds').select(`
      *,
      room:rooms(*),
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*))
    `).order('bed_number');
    if (error) throw error;
    return data as Bed[];
  },

  async update(id: string, updates: Partial<Bed>) {
    const { data, error } = await supabase.from('beds').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Bed;
  },

  async create(bed: Partial<Bed>) {
    const { data, error } = await supabase.from('beds').insert(bed).select().maybeSingle();
    if (error) throw error;
    return data as Bed;
  },

  async remove(id: string) {
    const { error } = await supabase.from('beds').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============ ROOMS ============
export const roomsApi = {
  async getAll() {
    const { data, error } = await supabase.from('rooms').select('*').order('room_number');
    if (error) throw error;
    return data as any[];
  },
};

// ============ OPERATION THEATRES ============
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

// ============ APPOINTMENTS ============
export const appointmentsApi = {
  async getAll(filters?: {
    patient_id?: string;
    doctor_id?: string;
    status?: string;
    date?: string;
    search?: string;
  }) {
    let q = supabase.from('appointments').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*), department:departments(*)),
      department:departments(*),
      video_session:video_sessions(*)
    `).order('appointment_date', { ascending: false });

    if (filters?.patient_id) q = q.eq('patient_id', filters.patient_id);
    if (filters?.doctor_id) q = q.eq('doctor_id', filters.doctor_id);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.date) q = q.eq('appointment_date', filters.date);

    const { data, error } = await q;
    if (error) throw error;
    let appts = data as Appointment[];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      appts = appts.filter(a =>
        a.appointment_number.toLowerCase().includes(s) ||
        a.patient?.profile?.full_name?.toLowerCase().includes(s) ||
        a.doctor?.profile?.full_name?.toLowerCase().includes(s) ||
        a.reason.toLowerCase().includes(s)
      );
    }
    return appts;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('appointments').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*), department:departments(*)),
      department:departments(*),
      video_session:video_sessions(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Appointment;
  },

  async create(appt: Partial<Appointment>) {
    const { data, error } = await supabase.from('appointments').insert(appt).select().maybeSingle();
    if (error) throw error;
    // Fetch with relations for the confirmation screen
    const { data: full } = await supabase.from('appointments').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*), department:departments(*)),
      department:departments(*),
      video_session:video_sessions(*)
    `).eq('id', data.id).maybeSingle();
    return (full || data) as Appointment;
  },

  async update(id: string, updates: Partial<Appointment>) {
    const { data, error } = await supabase.from('appointments').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Appointment;
  },

  async cancel(id: string, reason: string, cancelledBy: string) {
    return this.update(id, { status: 'cancelled', cancelled_reason: reason, cancelled_by: cancelledBy });
  },
};

// ============ MEDICAL REPORTS ============
export const medicalReportsApi = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase.from('medical_reports').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*))
    `).eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as MedicalReport[];
  },

  async create(report: Partial<MedicalReport>) {
    const { data, error } = await supabase.from('medical_reports').insert(report).select().maybeSingle();
    if (error) throw error;
    return data as MedicalReport;
  },

  async update(id: string, updates: Partial<MedicalReport>) {
    const { data, error } = await supabase.from('medical_reports').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as MedicalReport;
  },

  async remove(id: string) {
    const { error } = await supabase.from('medical_reports').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadFile(file: File, patientId: string) {
    const ext = file.name.split('.').pop();
    const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('medical-reports').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('medical-reports').getPublicUrl(path);
    return urlData.publicUrl;
  },
};

// ============ PRESCRIPTIONS ============
export const prescriptionsApi = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase.from('prescriptions').select(`
      *,
      patient:patients(*, profile:profiles!patients_profile_id_fkey(*)),
      doctor:doctors(*, profile:profiles!doctors_profile_id_fkey(*))
    `).eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as Prescription[];
  },

  async getByAppointment(appointmentId: string) {
    const { data, error } = await supabase.from('prescriptions').select('*').eq('appointment_id', appointmentId).maybeSingle();
    if (error) throw error;
    return data as Prescription | null;
  },

  async create(prescription: Partial<Prescription>) {
    const { data, error } = await supabase.from('prescriptions').insert(prescription).select().maybeSingle();
    if (error) throw error;
    return data as Prescription;
  },

  async update(id: string, updates: Partial<Prescription>) {
    const { data, error } = await supabase.from('prescriptions').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as Prescription;
  },
};

// ============ CLINICAL NOTES ============
export const clinicalNotesApi = {
  async getByAppointment(appointmentId: string) {
    const { data, error } = await supabase.from('clinical_notes').select('*').eq('appointment_id', appointmentId).maybeSingle();
    if (error) throw error;
    return data as ClinicalNote | null;
  },

  async getByPatient(patientId: string) {
    const { data, error } = await supabase.from('clinical_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as ClinicalNote[];
  },

  async create(note: Partial<ClinicalNote>) {
    const { data, error } = await supabase.from('clinical_notes').insert(note).select().maybeSingle();
    if (error) throw error;
    return data as ClinicalNote;
  },

  async update(id: string, updates: Partial<ClinicalNote>) {
    const { data, error } = await supabase.from('clinical_notes').update(updates).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data as ClinicalNote;
  },
};

// ============ VIDEO SESSIONS ============
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

// ============ NOTIFICATIONS ============
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

// ============ ANALYTICS ============
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

export const healthProblemsApi = {
  async getAll(): Promise<HealthProblem[]> {
    const { data, error } = await supabase
      .from('health_problems')
      .select('*, department:departments(*)')
      .eq('is_active', true)
      .order('category', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getByDepartment(departmentId: string): Promise<HealthProblem[]> {
    const { data, error } = await supabase
      .from('health_problems')
      .select('*, department:departments(*)')
      .eq('department_id', departmentId)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },
};

export const slotsApi = {
  async getAvailableSlots(doctorId: string, date: string): Promise<{ time: string; available: boolean }[]> {
    const { data: doctor, error: docError } = await supabase
      .from('doctors')
      .select('morning_start, morning_end, evening_start, evening_end, slot_duration_minutes, available_days')
      .eq('id', doctorId)
      .maybeSingle();
    if (docError) throw docError;
    if (!doctor) return [];

    const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    if (!doctor.available_days?.includes(dayName)) return [];

    const { data: booked, error: apptError } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress']);
    if (apptError) throw apptError;

    const bookedTimes = new Set((booked || []).map((a: any) => String(a.appointment_time).slice(0, 5)));
    const slotDuration = doctor.slot_duration_minutes || 30;
    const slots: { time: string; available: boolean }[] = [];

    const generateSlots = (start: string, end: string) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let totalMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      while (totalMin + slotDuration <= endMin) {
        const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const m = String(totalMin % 60).padStart(2, '0');
        const timeStr = `${h}:${m}`;
        slots.push({ time: timeStr, available: !bookedTimes.has(timeStr) });
        totalMin += slotDuration;
      }
    };

    if (doctor.morning_start && doctor.morning_end) generateSlots(doctor.morning_start, doctor.morning_end);
    if (doctor.evening_start && doctor.evening_end) generateSlots(doctor.evening_start, doctor.evening_end);

    return slots;
  },
};
