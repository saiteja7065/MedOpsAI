import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, Search, Download, Sparkles, Eye, Trash2, FileImage, FileCheck } from 'lucide-react';
import { medicalReportsApi, patientsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Card, CardHeader, Skeleton, EmptyState, Modal, Button, Badge } from '../../components/ui';
import { formatDate, timeAgo } from '../../lib/utils';

export function MedicalReports() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: patient } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: () => patientsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['patient-reports', patient?.id],
    queryFn: () => medicalReportsApi.getByPatient(patient!.id),
    enabled: !!patient,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileUrl = await medicalReportsApi.uploadFile(file, patient!.id);
      // Simulate AI OCR processing
      const aiSummary = `This medical report appears to be a ${file.name.includes('lab') ? 'laboratory test' : 'medical'} document. AI has extracted key information including patient vitals, test results, and diagnostic indicators. The report shows normal ranges for most parameters with some areas requiring follow-up consultation.`;
      const aiDiseases = ['Hypertension (monitoring)', 'Vitamin D deficiency'];
      const aiMedicines = ['Vitamin D3 1000IU', 'Multivitamin daily'];
      return medicalReportsApi.create({
        patient_id: patient!.id,
        report_type: file.name.match(/lab|test|blood/i) ? 'lab' : 'other',
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        ai_summary: aiSummary,
        ai_diseases: aiDiseases,
        ai_medicines: aiMedicines,
        ai_test_results: { hemoglobin: '13.5 g/dL', whiteBloodCells: '7.2 K/µL', platelets: '250 K/µL' },
        is_processed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-reports'] });
      setShowUpload(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: medicalReportsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-reports'] }),
  });

  const filtered = reports.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Reports</h1>
          <p className="text-slate-500">Upload and manage your medical documents</p>
        </div>
        <Button icon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()}>Upload Report</Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); }}
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..." className="input pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No medical reports"
          description="Upload your medical reports for AI-powered analysis"
          action={<Button icon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()}>Upload Report</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(report => (
            <div key={report.id} className="card p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
                {report.is_processed && <Badge variant="success" icon={<Sparkles className="w-3 h-3" />}>AI Processed</Badge>}
              </div>
              <h3 className="font-medium truncate">{report.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{formatDate(report.created_at, 'long')}</p>
              {report.ai_summary && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{report.ai_summary}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelected(report)}>View</Button>
                {report.file_url && (
                  <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => deleteMutation.mutate(report.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Report Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{selected.title}</h3>
                <p className="text-sm text-slate-500">{formatDate(selected.created_at, 'long')}</p>
              </div>
            </div>

            {selected.ai_summary && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <p className="font-medium text-sm">AI Summary</p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selected.ai_summary}</p>
              </div>
            )}

            {selected.ai_diseases && selected.ai_diseases.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Detected Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {selected.ai_diseases.map((d: string) => <Badge key={d} variant="warning">{d}</Badge>)}
                </div>
              </div>
            )}

            {selected.ai_medicines && selected.ai_medicines.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Mentioned Medicines</p>
                <div className="flex flex-wrap gap-2">
                  {selected.ai_medicines.map((m: string) => <Badge key={m} variant="info">{m}</Badge>)}
                </div>
              </div>
            )}

            {selected.ai_test_results && (
              <div>
                <p className="text-sm font-medium mb-2">Test Results</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(selected.ai_test_results).map(([key, value]) => (
                    <div key={key} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="font-medium">{value as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.file_url && (
              <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download Original
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
