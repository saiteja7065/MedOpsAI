import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Sun, Moon, Phone } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { doctorsApi, staffShiftsApi } from '../../lib/api';
import { Card, CardHeader, Skeleton, EmptyState, Badge } from '../../components/ui';
import { startOfWeek, weekDates } from '../../lib/staffScheduling';
import { formatDate } from '../../lib/utils';
import type { ShiftType } from '../../types';

const SHIFT_ICON: Record<ShiftType, typeof Sun> = { morning: Sun, evening: Moon, on_call: Phone };
const SHIFT_LABEL: Record<ShiftType, string> = { morning: 'Morning shift', evening: 'Evening shift', on_call: 'On-call' };

export function DoctorSchedule() {
  const { user } = useAuthStore();

  const { data: doctor } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: () => doctorsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const weekStart = startOfWeek(new Date());
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
  const days = [...weekDates(weekStart), ...weekDates(nextWeekStart)];

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['my-shifts', doctor?.id, days[0], days[13]],
    queryFn: () => staffShiftsApi.getAll({ doctorId: doctor!.id, startDate: days[0], endDate: days[13] }),
    enabled: !!doctor,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <p className="text-slate-500">Your assigned shifts for the next two weeks</p>
      </div>

      <Card>
        <CardHeader title="Recurring Availability" icon={<CalendarRange className="w-5 h-5" />} />
        <div className="flex flex-wrap gap-2 mb-3">
          {doctor?.available_days?.map(d => <Badge key={d} variant="info">{d}</Badge>)}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500">Morning</p><p className="font-medium">{doctor?.morning_start} – {doctor?.morning_end}</p></div>
          <div><p className="text-slate-500">Evening</p><p className="font-medium">{doctor?.evening_start} – {doctor?.evening_end}</p></div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Upcoming Shifts" subtitle="Assigned by admin — see Staff Scheduling" icon={<CalendarRange className="w-5 h-5" />} />
        {shifts.length === 0 ? (
          <EmptyState icon={<CalendarRange className="w-8 h-8" />} title="No shifts assigned yet" description="Your admin hasn't scheduled you for the next two weeks" />
        ) : (
          <div className="space-y-2">
            {shifts.map(s => {
              const Icon = SHIFT_ICON[s.shift_type];
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{formatDate(s.shift_date, 'long')}</p>
                    <p className="text-xs text-slate-500">{SHIFT_LABEL[s.shift_type]}{s.department?.name ? ` · ${s.department.name}` : ''}</p>
                  </div>
                  <Badge variant={s.status === 'absent' ? 'danger' : s.status === 'cancelled' ? 'neutral' : 'success'}>{s.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
