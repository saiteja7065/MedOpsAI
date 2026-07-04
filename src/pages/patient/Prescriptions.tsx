import { useQuery } from '@tanstack/react-query';
import { Pill, Clock, Calendar, User, FileText, Download } from 'lucide-react';
import { prescriptionsApi, patientsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Card, CardHeader, Skeleton, EmptyState, Badge, Avatar } from '../../components/ui';
import { formatDate } from '../../lib/utils';

export function Prescriptions() {
  const { user } = useAuthStore();

  const { data: patient } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: () => patientsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['patient-prescriptions', patient?.id],
    queryFn: () => prescriptionsApi.getByPatient(patient!.id),
    enabled: !!patient,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prescriptions</h1>
        <p className="text-slate-500">Your prescription history</p>
      </div>

      {prescriptions.length === 0 ? (
        <EmptyState icon={<Pill className="w-8 h-8" />} title="No prescriptions" description="Your doctor's prescriptions will appear here" />
      ) : (
        <div className="space-y-4">
          {prescriptions.map(presc => (
            <Card key={presc.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{presc.diagnosis}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar name={presc.doctor?.profile?.full_name || 'D'} size="sm" />
                      <span className="text-sm text-slate-500">Dr. {presc.doctor?.profile?.full_name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{formatDate(presc.created_at, 'long')}</p>
                  {presc.follow_up_date && <Badge variant="warning" icon={<Calendar className="w-3 h-3" />}>Follow-up: {formatDate(presc.follow_up_date)}</Badge>}
                </div>
              </div>

              {/* Medicines */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">Medicines</p>
                {presc.medicines?.map((med: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-slate-500">{med.dosage} • {med.frequency} • {med.duration}</p>
                    </div>
                  </div>
                ))}
              </div>

              {presc.instructions && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Instructions</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{presc.instructions}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
