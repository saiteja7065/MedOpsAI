import { supabase } from '../supabase';

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
