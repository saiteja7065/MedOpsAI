import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Eye, FileText, Video, Stethoscope } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { doctorsApi, appointmentsApi, medicalReportsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button, Avatar, Badge } from '../../components/ui';
import { formatDate } from '../../lib/utils';

export function DoctorPatients() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: doctor } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: () => doctorsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments', doctor?.id],
    queryFn: () => appointmentsApi.getAll({ doctor_id: doctor!.id }),
    enabled: !!doctor,
  });

  // Get unique patients from appointments
  const patientMap = new Map();
  appointments.forEach(a => {
    if (a.patient && !patientMap.has(a.patient.id)) {
      patientMap.set(a.patient.id, { ...a.patient, appointmentCount: 1, lastVisit: a.appointment_date });
    } else if (a.patient) {
      const p = patientMap.get(a.patient.id);
      p.appointmentCount++;
      if (new Date(a.appointment_date) > new Date(p.lastVisit)) p.lastVisit = a.appointment_date;
    }
  });
  const patients = Array.from(patientMap.values()).filter(p =>
    p.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Patients</h1>
        <p className="text-slate-500">Patients under your care</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..." className="input pl-10" />
      </div>

      {patients.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No patients yet" description="Patients will appear here after their first appointment" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(patient => (
            <div key={patient.id} className="card p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={patient.profile?.full_name || 'P'} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{patient.profile?.full_name}</h3>
                  <p className="text-sm text-slate-500">{patient.patient_id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {patient.blood_group && <Badge variant="danger">{patient.blood_group}</Badge>}
                    <Badge variant="info">{patient.appointmentCount} visits</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-500 mb-4">
                <p>Last visit: {formatDate(patient.lastVisit)}</p>
                {patient.chronic_conditions?.length > 0 && <p>Conditions: {patient.chronic_conditions.join(', ')}</p>}
              </div>
              <Button variant="secondary" size="sm" className="w-full" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelected(patient)}>View Details</Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Patient Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selected.profile?.full_name} size="lg" />
              <div>
                <h3 className="text-lg font-bold">{selected.profile?.full_name}</h3>
                <p className="text-slate-500">{selected.patient_id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-slate-500">Email</p><p className="font-medium">{selected.profile?.email}</p></div>
              <div><p className="text-sm text-slate-500">Phone</p><p className="font-medium">{selected.profile?.phone || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Blood Group</p><p className="font-medium">{selected.blood_group || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Total Visits</p><p className="font-medium">{selected.appointmentCount}</p></div>
            </div>
            {selected.allergies?.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {selected.allergies.map((a: string) => <Badge key={a} variant="warning">{a}</Badge>)}
                </div>
              </div>
            )}
            {selected.chronic_conditions?.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 mb-1">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {selected.chronic_conditions.map((c: string) => <Badge key={c} variant="danger">{c}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
