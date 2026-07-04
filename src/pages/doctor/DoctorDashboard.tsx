import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Video, FileText, Clock, CheckCircle, XCircle, Activity, Stethoscope, Star } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { doctorsApi, appointmentsApi, patientsApi } from '../../lib/api';
import { Card, CardHeader, StatCard, Skeleton, EmptyState, StatusBadge, Avatar, Button } from '../../components/ui';
import { formatDate, timeAgo } from '../../lib/utils';

export function DoctorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: () => doctorsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['doctor-appointments', doctor?.id],
    queryFn: () => appointmentsApi.getAll({ doctor_id: doctor!.id }),
    enabled: !!doctor,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => appointmentsApi.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.appointment_date === today);
  const pending = appointments.filter(a => a.status === 'pending');
  const completed = appointments.filter(a => a.status === 'completed');
  const videoAppts = appointments.filter(a => a.type === 'video' && ['confirmed', 'pending'].includes(a.status));
  const patientQueue = appointments.filter(a => a.status === 'confirmed' && a.appointment_date === today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, Dr. {user?.full_name?.split(' ')[0]}</h1>
          <p className="text-slate-500">{doctor?.specialization} • {doctor?.department?.name || 'General'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-medium text-sm">{doctor?.rating}</span>
          </div>
          <div className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-full text-sm font-medium text-primary-700 dark:text-primary-300">
            {doctor?.total_consultations} consultations
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Today's Appointments" value={todayAppts.length} icon={<Calendar className="w-5 h-5" />} color="primary" />
        <StatCard label="Pending Approvals" value={pending.length} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatCard label="Video Calls" value={videoAppts.length} icon={<Video className="w-5 h-5" />} color="cyan" />
        <StatCard label="Completed" value={completed.length} icon={<CheckCircle className="w-5 h-5" />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Queue */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's Patient Queue"
            subtitle={`${patientQueue.length} patients scheduled`}
            icon={<Users className="w-5 h-5" />}
            action={<Button variant="ghost" size="sm" onClick={() => navigate('/doctor/appointments')}>View all</Button>}
          />
          {patientQueue.length === 0 ? (
            <EmptyState icon={<Calendar className="w-8 h-8" />} title="No patients today" description="Your confirmed appointments will appear here" />
          ) : (
            <div className="space-y-2">
              {patientQueue.slice(0, 6).map(appt => (
                <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-slate-500">{appt.appointment_time}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                  <Avatar name={appt.patient?.profile?.full_name || 'P'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{appt.patient?.profile?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{appt.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.type === 'video' && <Video className="w-4 h-4 text-cyan-500" />}
                    <StatusBadge status={appt.status} />
                    {appt.type === 'video' && appt.status === 'confirmed' && (
                      <Button variant="secondary" size="sm" icon={<Video className="w-3.5 h-3.5" />} onClick={() => navigate(`/doctor/video-call/${appt.id}`)}>Join</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader title="Pending Approvals" subtitle={`${pending.length} awaiting`} icon={<Clock className="w-5 h-5" />} />
          {pending.length === 0 ? (
            <EmptyState icon={<CheckCircle className="w-8 h-8" />} title="All caught up" />
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 5).map(appt => (
                <div key={appt.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={appt.patient?.profile?.full_name || 'P'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{appt.patient?.profile?.full_name}</p>
                      <p className="text-xs text-slate-500">{formatDate(appt.appointment_date)} • {appt.appointment_time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" className="flex-1" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => updateMutation.mutate({ id: appt.id, updates: { status: 'confirmed' } })}>Accept</Button>
                    <Button variant="danger" size="sm" className="flex-1" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => updateMutation.mutate({ id: appt.id, updates: { status: 'cancelled' } })}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" icon={<Activity className="w-5 h-5" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Appointments', icon: Calendar, route: '/doctor/appointments', color: 'from-primary-500 to-cyan-500' },
            { label: 'My Patients', icon: Users, route: '/doctor/patients', color: 'from-emerald-500 to-teal-500' },
            { label: 'Video Calls', icon: Video, route: '/doctor/video-sessions', color: 'from-cyan-500 to-blue-500' },
            { label: 'Reports', icon: FileText, route: '/doctor/reports', color: 'from-amber-500 to-orange-500' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(action.route)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
