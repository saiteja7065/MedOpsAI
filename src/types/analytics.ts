export interface AnalyticsSnapshot {
  id: string;
  snapshot_date: string;
  total_patients: number;
  total_doctors: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  beds_occupied: number;
  beds_available: number;
  ot_utilization: number;
  revenue: number;
  emergency_cases: number;
  video_consultations: number;
  created_at: string;
}
