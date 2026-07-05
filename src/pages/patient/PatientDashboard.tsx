import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, Video, Bot, Clock, CheckCircle, AlertCircle, Activity, HeartPulse, Pill } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { patientsApi, appointmentsApi, medicalReportsApi, prescriptionsApi } from '../../lib/api';
import { Card, CardHeader, StatCard, Skeleton, EmptyState, StatusBadge, Avatar, Button } from '../../components/ui';
import { formatDate, timeAgo } from '../../lib/utils';

export function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: () => patientsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['patient-appointments', patient?.id],
    queryFn: () => appointmentsApi.getAll({ patient_id: patient!.id }),
    enabled: !!patient,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['patient-reports', patient?.id],
    queryFn: () => medicalReportsApi.getByPatient(patient!.id),
    enabled: !!patient,
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patient-prescriptions', patient?.id],
    queryFn: () => prescriptionsApi.getByPatient(patient!.id),
    enabled: !!patient,
  });

  if (patientLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  const completed = appointments.filter(a => a.status === 'completed');
  const videoAppts = appointments.filter(a => a.type === 'video' && ['confirmed', 'pending'].includes(a.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-slate-500">Your health dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Upcoming" value={upcoming.length} icon={<Calendar className="w-5 h-5" />} color="primary" />
        <StatCard label="Completed" value={completed.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
        <StatCard label="Video Calls" value={videoAppts.length} icon={<Video className="w-5 h-5" />} color="cyan" />
        <StatCard label="Reports" value={reports.length} icon={<FileText className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Upcoming Appointments"
            icon={<Calendar className="w-5 h-5" />}
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/patient/appointments')}>View all</Button>}
          />
          {upcoming.length === 0 ? (
            <EmptyState icon={<Calendar className="w-8 h-8" />} title="No upcoming appointments" description="Book your next appointment" action={<Button onClick={() => navigate('/patient/book')}>Book Appointment</Button>} />
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map(appt => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-slate-500">{formatDate(appt.appointment_date, 'short').split(',')[0]}</p>
                    <p className="text-xl font-bold">{new Date(appt.appointment_date).getDate()}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Dr. {appt.doctor?.profile?.full_name}</p>
                    <p className="text-xs text-slate-500">{appt.doctor?.specialization} • {appt.appointment_time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.type === 'video' && <Video className="w-4 h-4 text-cyan-500" />}
                    <StatusBadge status={appt.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader title="Quick Actions" icon={<Activity className="w-5 h-5" />} />
          <div className="space-y-2">
            {[
              { label: 'Book Appointment', icon: Calendar, route: '/patient/book', color: 'from-primary-500 to-cyan-500' },
              { label: 'Video Consultation', icon: Video, route: '/patient/video-sessions', color: 'from-cyan-500 to-teal-500' },
              { label: 'AI Copilot', icon: Bot, route: '/patient/copilot', color: 'from-emerald-500 to-green-500' },
              { label: 'Upload Report', icon: FileText, route: '/patient/reports', color: 'from-amber-500 to-orange-500' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <Card>
          <CardHeader
            title="Recent Medical Reports"
            icon={<FileText className="w-5 h-5" />}
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/patient/reports')}>View all</Button>}
          />
          {reports.length === 0 ? (
            <EmptyState icon={<FileText className="w-8 h-8" />} title="No reports uploaded" />
          ) : (
            <div className="space-y-2">
              {reports.slice(0, 3).map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{report.title}</p>
                    <p className="text-xs text-slate-500">{timeAgo(report.created_at)}</p>
                  </div>
                  {report.is_processed && <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">AI Processed</span>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active Prescriptions */}
        <Card>
          <CardHeader
            title="Active Prescriptions"
            icon={<Pill className="w-5 h-5" />}
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/patient/prescriptions')}>View all</Button>}
          />
          {prescriptions.length === 0 ? (
            <EmptyState icon={<Pill className="w-8 h-8" />} title="No prescriptions" />
          ) : (
            <div className="space-y-2">
              {prescriptions.slice(0, 3).map(presc => (
                <div key={presc.id} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="w-4 h-4 text-primary-500" />
                    <p className="font-medium text-sm">{presc.diagnosis}</p>
                  </div>
                  <p className="text-xs text-slate-500">Dr. {presc.doctor?.profile?.full_name} • {presc.medicines?.length || 0} medicines</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Health Info */}
      {patient && (
        <Card>
          <CardHeader title="Health Information" icon={<HeartPulse className="w-5 h-5" />} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-sm text-slate-500">Blood Group</p><p className="font-bold text-lg">{patient.blood_group || 'N/A'}</p></div>
            <div><p className="text-sm text-slate-500">Height</p><p className="font-bold text-lg">{patient.height_cm ? `${patient.height_cm} cm` : 'N/A'}</p></div>
            <div><p className="text-sm text-slate-500">Weight</p><p className="font-bold text-lg">{patient.weight_kg ? `${patient.weight_kg} kg` : 'N/A'}</p></div>
            <div><p className="text-sm text-slate-500">Patient ID</p><p className="font-bold text-lg">{patient.patient_id}</p></div>
          </div>
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 mb-2">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map(a => <span key={a} className="badge bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{a}</span>)}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
