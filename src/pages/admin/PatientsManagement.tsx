import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Mail, Phone, Eye, Droplet, Shield } from 'lucide-react';
import { patientsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button, Avatar, Badge } from '../../components/ui';

export function PatientsManagement() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => patientsApi.getAll(search),
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-slate-500">Manage patient records</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..." className="input pl-10" />
      </div>

      {patients.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No patients found" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Patient</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Patient ID</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Blood Group</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Insurance</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patients.map(patient => (
                  <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={patient.profile?.full_name || 'P'} size="sm" />
                        <div>
                          <p className="font-medium text-sm">{patient.profile?.full_name}</p>
                          <p className="text-xs text-slate-500">{patient.profile?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{patient.patient_id}</td>
                    <td className="p-4">
                      {patient.blood_group ? (
                        <Badge variant="danger" icon={<Droplet className="w-3 h-3" />}>{patient.blood_group}</Badge>
                      ) : '—'}
                    </td>
                    <td className="p-4">
                      <Badge variant={patient.is_admitted ? 'warning' : 'success'}>
                        {patient.is_admitted ? 'Admitted' : 'Outpatient'}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm">{patient.insurance_provider || '—'}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelected(patient)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
              <div><p className="text-sm text-slate-500">Height / Weight</p><p className="font-medium">{selected.height_cm || '—'} cm / {selected.weight_kg || '—'} kg</p></div>
              <div><p className="text-sm text-slate-500">Insurance</p><p className="font-medium">{selected.insurance_provider || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Insurance No</p><p className="font-medium">{selected.insurance_number || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Emergency Contact</p><p className="font-medium">{selected.emergency_contact_name || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Emergency Phone</p><p className="font-medium">{selected.emergency_contact_phone || 'N/A'}</p></div>
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
                  {selected.chronic_conditions.map((c: string) => <Badge key={c} variant="danger" icon={<Shield className="w-3 h-3" />}>{c}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
