import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Search, Eye, CheckCircle, XCircle, Clock, Video, Filter, CalendarClock, AlertCircle } from 'lucide-react';
import { appointmentsApi, slotsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button, StatusBadge, Avatar } from '../../components/ui';
import { formatDate, formatCurrency, cn } from '../../lib/utils';
import type { Appointment, AppointmentStatus } from '../../types';

interface AppointmentsPageProps {
  role: 'admin' | 'doctor' | 'patient';
  entityId?: string;
}

export function AppointmentsPage({ role, entityId }: AppointmentsPageProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const filters: any = {};
  if (role === 'doctor' && entityId) filters.doctor_id = entityId;
  if (role === 'patient' && entityId) filters.patient_id = entityId;
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (search) filters.search = search;

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', role, entityId, statusFilter, search],
    queryFn: () => appointmentsApi.getAll(filters),
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['reschedule-slots', rescheduleAppt?.doctor_id, newDate],
    queryFn: () => slotsApi.getAvailableSlots(rescheduleAppt!.doctor_id, newDate),
    enabled: !!rescheduleAppt && !!newDate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Appointment> }) => appointmentsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['reschedule-slots'] });
    },
  });

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    updateMutation.mutate({ id, updates: { status } });
    setSelected(null);
  };

  const handleReschedule = () => {
    if (!rescheduleAppt || !newDate || !newTime) return;
    updateMutation.mutate({
      id: rescheduleAppt.id,
      updates: {
        appointment_date: newDate,
        appointment_time: newTime,
        status: 'rescheduled',
      },
    });
    setRescheduleAppt(null);
    setNewDate('');
    setNewTime('');
    setSelected(null);
  };

  const handleCancel = (id: string) => {
    updateMutation.mutate({ id, updates: { status: 'cancelled', cancelled_by: role } });
    setSelected(null);
  };

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-slate-500">
            {role === 'admin' ? 'Manage all hospital appointments' : role === 'doctor' ? 'Your patient appointments' : 'Your appointment history'}
          </p>
        </div>
        {role === 'patient' && (
          <Button onClick={() => window.location.href = '/patient/book'} icon={<Calendar className="w-4 h-4" />}>
            Book New
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search appointments..." className="input pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="input w-auto">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="missed">Missed</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === s ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-2 text-xs opacity-70">
              {s === 'all' ? appointments.length : appointments.filter(a => a.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon={<Calendar className="w-8 h-8" />} title="No appointments found" description="Try adjusting your filters" />
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => (
            <div key={appt.id} className="card p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-slate-500">{formatDate(appt.appointment_date, 'short').split(',')[0]}</p>
                  <p className="text-2xl font-bold">{new Date(appt.appointment_date).getDate()}</p>
                  <p className="text-xs text-slate-500">{appt.appointment_time}</p>
                </div>
                <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{appt.appointment_number}</span>
                    <StatusBadge status={appt.status} />
                    {appt.type === 'video' && <span className="badge bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"><Video className="w-3 h-3" /> Video</span>}
                    {appt.priority === 'emergency' && <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Emergency</span>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {role === 'doctor' ? `Patient: ${appt.patient?.profile?.full_name || 'N/A'}` :
                     role === 'patient' ? `Dr. ${appt.doctor?.profile?.full_name || 'N/A'}` :
                     `${appt.patient?.profile?.full_name} → Dr. ${appt.doctor?.profile?.full_name}`}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{appt.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  {role === 'doctor' && appt.status === 'pending' && (
                    <>
                      <Button variant="success" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => handleStatusChange(appt.id, 'confirmed')}>Accept</Button>
                      <Button variant="danger" size="sm" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => handleStatusChange(appt.id, 'cancelled')}>Reject</Button>
                    </>
                  )}
                  {role === 'patient' && appt.status === 'confirmed' && appt.type === 'video' && (
                    <Button variant="secondary" size="sm" icon={<Video className="w-3.5 h-3.5" />} onClick={() => window.location.href = `/${role}/video-sessions`}>Join</Button>
                  )}
                  <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelected(appt)}>View</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Appointment Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Appointment Number</p>
                <p className="font-bold text-lg">{selected.appointment_number}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Patient</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar name={selected.patient?.profile?.full_name || 'P'} size="sm" />
                  <span className="font-medium">{selected.patient?.profile?.full_name}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Doctor</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar name={selected.doctor?.profile?.full_name || 'D'} size="sm" />
                  <div>
                    <p className="font-medium">{selected.doctor?.profile?.full_name}</p>
                    <p className="text-xs text-slate-500">{selected.doctor?.specialization}</p>
                  </div>
                </div>
              </div>
              <div><p className="text-sm text-slate-500">Date & Time</p><p className="font-medium">{formatDate(selected.appointment_date, 'long')} at {selected.appointment_time}</p></div>
              <div><p className="text-sm text-slate-500">Type</p><p className="font-medium capitalize">{selected.type.replace('_', ' ')}</p></div>
              <div><p className="text-sm text-slate-500">Priority</p><p className="font-medium capitalize">{selected.priority}</p></div>
              <div><p className="text-sm text-slate-500">Fee</p><p className="font-medium">{formatCurrency(selected.fee)}</p></div>
            </div>
            <div>
              <p className="text-sm text-slate-500">Reason</p>
              <p className="mt-1">{selected.reason}</p>
            </div>
            {selected.symptoms && selected.symptoms.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {selected.symptoms.map(s => <span key={s} className="badge bg-slate-100 dark:bg-slate-800">{s}</span>)}
                </div>
              </div>
            )}
            {selected.notes && <div><p className="text-sm text-slate-500">Notes</p><p className="mt-1">{selected.notes}</p></div>}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {role === 'doctor' && (
                <>
                  {selected.status === 'pending' && <Button variant="success" onClick={() => handleStatusChange(selected.id, 'confirmed')}>Accept</Button>}
                  {selected.status === 'confirmed' && <Button variant="primary" onClick={() => handleStatusChange(selected.id, 'in_progress')}>Start Consultation</Button>}
                  {selected.status === 'in_progress' && <Button variant="success" onClick={() => handleStatusChange(selected.id, 'completed')}>Mark Completed</Button>}
                </>
              )}
              {role === 'patient' && !['completed', 'cancelled', 'missed'].includes(selected.status) && (
                <>
                  <Button variant="secondary" icon={<CalendarClock className="w-4 h-4" />} onClick={() => { setRescheduleAppt(selected); setNewDate(''); setNewTime(''); }}>
                    Reschedule
                  </Button>
                  <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => handleCancel(selected.id)}>
                    Cancel Appointment
                  </Button>
                </>
              )}
              {role === 'admin' && (
                <>
                  <Button variant="danger" onClick={() => handleStatusChange(selected.id, 'cancelled')}>Cancel</Button>
                  <Button variant="success" onClick={() => handleStatusChange(selected.id, 'completed')}>Mark Completed</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal open={!!rescheduleAppt} onClose={() => setRescheduleAppt(null)} title="Reschedule Appointment" size="md">
        {rescheduleAppt && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500">Current Appointment</p>
              <p className="font-medium">{formatDate(rescheduleAppt.appointment_date, 'long')} at {rescheduleAppt.appointment_time}</p>
              <p className="text-xs text-slate-400 mt-1">Dr. {rescheduleAppt.doctor?.profile?.full_name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">New Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => { setNewDate(e.target.value); setNewTime(''); }}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            {newDate && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Available Slots
                  {slotsLoading && <span className="ml-2 text-xs text-slate-400">Loading...</span>}
                </label>
                {slotsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-6 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                    <p className="text-sm text-slate-500">No available slots on this date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setNewTime(slot.time)}
                        disabled={!slot.available}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all text-center',
                          !slot.available
                            ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                            : newTime === slot.time
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button onClick={handleReschedule} disabled={!newDate || !newTime} className="flex-1">
                Confirm Reschedule
              </Button>
              <Button variant="ghost" onClick={() => setRescheduleAppt(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
