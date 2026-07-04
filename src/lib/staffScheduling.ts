import type { Doctor } from '../types';

/**
 * Deterministic staff shift allocation.
 *
 * Like demand forecasting, this is a matching/allocation problem, not a
 * language problem — the answer should be reliable and re-runnable, not an
 * LLM's best guess. A doctor's existing available_days/morning_start/
 * evening_start already describe their recurring weekly pattern (used
 * today by the appointment slot generator); this just projects that
 * pattern onto specific calendar dates for a given week so shifts can be
 * tracked, assigned, and marked absent/cancelled day by day.
 */

export interface GeneratedShift {
  doctor_id: string;
  department_id?: string;
  shift_date: string; // YYYY-MM-DD
  shift_type: 'morning' | 'evening';
}

export function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function generateWeekShifts(weekStart: Date, doctors: Doctor[]): GeneratedShift[] {
  const shifts: GeneratedShift[] = [];

  for (const doctor of doctors) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      if (!doctor.available_days?.includes(dayName)) continue;

      const shiftDate = d.toISOString().split('T')[0];
      if (doctor.morning_start && doctor.morning_end) {
        shifts.push({ doctor_id: doctor.id, department_id: doctor.department_id, shift_date: shiftDate, shift_type: 'morning' });
      }
      if (doctor.evening_start && doctor.evening_end) {
        shifts.push({ doctor_id: doctor.id, department_id: doctor.department_id, shift_date: shiftDate, shift_type: 'evening' });
      }
    }
  }

  return shifts;
}

export function weekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().split('T')[0];
  });
}
