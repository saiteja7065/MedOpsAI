import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, Download, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { doctorsApi, medicalReportsApi, appointmentsApi } from '../../lib/api';
import { Card, CardHeader, Skeleton, EmptyState, Modal, Badge, Avatar } from '../../components/ui';
import { formatDate, timeAgo } from '../../lib/utils';
import { useState } from 'react';

export function DoctorReports() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<any>(null);

  const { data: doctor } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: () => doctorsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['doctor-appointments', doctor?.id],
    queryFn: () => appointmentsApi.getAll({ doctor_id: doctor!.id }),
    enabled: !!doctor,
  });

  // Get all reports from appointments
  const patientIds = new Set(appointments.map(a => a.patient_id));
  const { data: allReports = [], isLoading } = useQuery({
    queryKey: ['doctor-all-reports'],
    queryFn: async () => {
      const all: any[] = [];
      for (const pid of patientIds) {
        const reports = await medicalReportsApi.getByPatient(pid);
        all.push(...reports);
      }
      return all;
    },
    enabled: patientIds.size > 0,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patient Reports</h1>
        <p className="text-slate-500">Medical reports from your patients</p>
      </div>

      {allReports.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />} title="No reports" description="Patient reports will appear here" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allReports.map(report => (
            <div key={report.id} className="card p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
                {report.is_processed && <Badge variant="success" icon={<Sparkles className="w-3 h-3" />}>AI</Badge>}
              </div>
              <h3 className="font-medium truncate">{report.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Avatar name={report.patient?.profile?.full_name || 'P'} size="sm" />
                <p className="text-xs text-slate-500">{report.patient?.profile?.full_name} • {timeAgo(report.created_at)}</p>
              </div>
              {report.ai_summary && <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{report.ai_summary}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSelected(report)} className="btn-secondary flex-1 text-xs px-3 py-1.5"><Eye className="w-3.5 h-3.5" /> View</button>
                {report.file_url && <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs"><Download className="w-3.5 h-3.5" /></a>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Report Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">{selected.title}</h3>
            <p className="text-sm text-slate-500">{formatDate(selected.created_at, 'long')}</p>
            {selected.ai_summary && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-primary-600" /><p className="font-medium text-sm">AI Summary</p></div>
                <p className="text-sm">{selected.ai_summary}</p>
              </div>
            )}
            {selected.ai_diseases?.length > 0 && (
              <div><p className="text-sm font-medium mb-2">Conditions</p><div className="flex flex-wrap gap-2">{selected.ai_diseases.map((d: string) => <Badge key={d} variant="warning">{d}</Badge>)}</div></div>
            )}
            {selected.ai_medicines?.length > 0 && (
              <div><p className="text-sm font-medium mb-2">Medicines</p><div className="flex flex-wrap gap-2">{selected.ai_medicines.map((m: string) => <Badge key={m} variant="info">{m}</Badge>)}</div></div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
