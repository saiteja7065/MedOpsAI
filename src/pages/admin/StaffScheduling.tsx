import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { doctorsApi, departmentsApi, staffShiftsApi } from '../../lib/api';
import { Card, CardHeader, Skeleton, EmptyState, Button, Avatar } from '../../components/ui';
import { cn } from '../../lib/utils';
import { startOfWeek, weekDates, generateWeekShifts } from '../../lib/staffScheduling';
import type { ShiftType, StaffShift } from '../../types';

const SHIFT_LABEL: Record<ShiftType, string> = { morning: 'AM', evening: 'PM', on_call: 'On-call' };
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-primary-200 dark:border-primary-800',
  absent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  cancelled: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

export function StaffScheduling() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [deptFilter, setDeptFilter] = useState('all');

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.getAll });
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', deptFilter],
    queryFn: () => doctorsApi.getAll(deptFilter !== 'all' ? { department_id: deptFilter } : undefined),
  });

  const days = weekDates(weekStart);
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['staff-shifts', days[0], days[6]],
    queryFn: () => staffShiftsApi.getAll({ startDate: days[0], endDate: days[6] }),
  });

  const shiftMap = new Map<string, StaffShift[]>();
  for (const s of shifts) {
    const key = `${s.doctor_id}|${s.shift_date}`;
    shiftMap.set(key, [...(shiftMap.get(key) || []), s]);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const generated = generateWeekShifts(weekStart, doctors);
      return staffShiftsApi.bulkCreateMissing(generated);
    },
    onSuccess: invalidate,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'scheduled' | 'absent' }) => staffShiftsApi.updateStatus(id, status),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => staffShiftsApi.remove(id),
    onSuccess: invalidate,
  });

  const addShiftMutation = useMutation({
    mutationFn: ({ doctorId, departmentId, date, type }: { doctorId: string; departmentId?: string; date: string; type: ShiftType }) =>
      staffShiftsApi.create({ doctor_id: doctorId, department_id: departmentId, shift_date: date, shift_type: type }),
    onSuccess: invalidate,
  });

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + delta * 7);
    setWeekStart(d);
  };

  const isLoading = doctorsLoading || shiftsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">Staff Scheduling <CalendarRange className="w-5 h-5 text-primary-500" /></h1>
          <p className="text-slate-500">Weekly shift assignment for doctors — completes scheduling alongside beds and OTs</p>
        </div>
        <Button icon={<Sparkles className="w-4 h-4" />} loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
          Auto-generate Week
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => shiftWeek(-1)} />
          <span className="text-sm font-medium">{days[0]} → {days[6]}</span>
          <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />} onClick={() => shiftWeek(1)} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input w-auto">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <Card>
        <CardHeader title="Weekly Roster" subtitle="Click a day to assign a shift, click a shift chip to toggle scheduled/absent" icon={<CalendarRange className="w-5 h-5" />} />
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : doctors.length === 0 ? (
          <EmptyState icon={<CalendarRange className="w-8 h-8" />} title="No doctors found" description="Add doctors under Doctors management first" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr>
                  <th className="text-left text-xs text-slate-500 font-medium p-2 sticky left-0 bg-white dark:bg-slate-900">Doctor</th>
                  {days.map(d => (
                    <th key={d} className="text-xs text-slate-500 font-medium p-2 text-center">
                      {new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doctors.map(doc => (
                  <tr key={doc.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-2 sticky left-0 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <Avatar name={doc.profile?.full_name || 'Dr'} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.profile?.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{doc.specialization}</p>
                        </div>
                      </div>
                    </td>
                    {days.map(date => {
                      const cellShifts = shiftMap.get(`${doc.id}|${date}`) || [];
                      return (
                        <td key={date} className="p-2 text-center align-top">
                          <div className="flex flex-col gap-1 items-center min-h-[32px]">
                            {cellShifts.map(s => (
                              <button
                                key={s.id}
                                className={cn('group relative px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_COLOR[s.status])}
                                onClick={() => toggleStatusMutation.mutate({ id: s.id, status: s.status === 'scheduled' ? 'absent' : 'scheduled' })}
                                title="Click to toggle scheduled/absent"
                              >
                                {SHIFT_LABEL[s.shift_type]}
                                <span
                                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 rounded-full bg-slate-700 text-white items-center justify-center"
                                  onClick={(e) => { e.stopPropagation(); removeMutation.mutate(s.id); }}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </span>
                              </button>
                            ))}
                            {(['morning', 'evening'] as ShiftType[]).filter(t => !cellShifts.some(s => s.shift_type === t)).map(t => (
                              <button
                                key={t}
                                className="px-2 py-0.5 rounded-full text-xs border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-primary-400 hover:text-primary-500"
                                onClick={() => addShiftMutation.mutate({ doctorId: doc.id, departmentId: doc.department_id, date, type: t })}
                              >
                                + {SHIFT_LABEL[t]}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
