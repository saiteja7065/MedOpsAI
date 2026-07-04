import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Search, Star, Plus, Mail, Phone, Eye, CheckCircle, XCircle } from 'lucide-react';
import { doctorsApi, departmentsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button, Avatar, Badge } from '../../components/ui';
import { cn } from '../../lib/utils';

export function DoctorsManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', { deptFilter }],
    queryFn: () => doctorsApi.getAll({ department_id: deptFilter === 'all' ? undefined : deptFilter, search }),
  });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.getAll });

  const toggleAvailability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => doctorsApi.update(id, { is_available: available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctors'] }),
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doctors</h1>
        <p className="text-slate-500">Manage doctor profiles and approvals</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctors..." className="input pl-10" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input w-auto">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {doctors.length === 0 ? (
        <EmptyState icon={<Stethoscope className="w-8 h-8" />} title="No doctors found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map(doctor => (
            <div key={doctor.id} className="card p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={doctor.profile?.full_name || 'Doctor'} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{doctor.profile?.full_name}</h3>
                  <p className="text-sm text-slate-500">{doctor.specialization}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-medium">{doctor.rating}</span>
                    <span className="text-xs text-slate-400">• {doctor.total_consultations} consults</span>
                  </div>
                </div>
                <Badge variant={doctor.is_available ? 'success' : 'neutral'}>
                  {doctor.is_available ? 'Available' : 'Off duty'}
                </Badge>
              </div>

              <div className="space-y-1.5 text-sm text-slate-500">
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {doctor.profile?.email}</p>
                <p className="flex items-center gap-2"><Stethoscope className="w-3.5 h-3.5" /> {doctor.qualification}</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {doctor.profile?.phone || 'N/A'}</p>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelected(doctor)}>View</Button>
                <Button
                  variant={doctor.is_available ? 'danger' : 'success'}
                  size="sm"
                  icon={doctor.is_available ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  onClick={() => toggleAvailability.mutate({ id: doctor.id, available: !doctor.is_available })}
                >
                  {doctor.is_available ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Doctor Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selected.profile?.full_name} size="lg" />
              <div>
                <h3 className="text-lg font-bold">{selected.profile?.full_name}</h3>
                <p className="text-slate-500">{selected.specialization}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-medium">{selected.rating}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-slate-500">Employee ID</p><p className="font-medium">{selected.employee_id}</p></div>
              <div><p className="text-sm text-slate-500">Experience</p><p className="font-medium">{selected.experience_years} years</p></div>
              <div><p className="text-sm text-slate-500">Consultation Fee</p><p className="font-medium">${selected.consultation_fee}</p></div>
              <div><p className="text-sm text-slate-500">Department</p><p className="font-medium">{selected.department?.name || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Email</p><p className="font-medium">{selected.profile?.email}</p></div>
              <div><p className="text-sm text-slate-500">Phone</p><p className="font-medium">{selected.profile?.phone || 'N/A'}</p></div>
              <div><p className="text-sm text-slate-500">Languages</p><p className="font-medium">{selected.languages?.join(', ')}</p></div>
              <div><p className="text-sm text-slate-500">Available Days</p><p className="font-medium">{selected.available_days?.join(', ')}</p></div>
            </div>
            {selected.bio && <div><p className="text-sm text-slate-500 mb-1">Bio</p><p className="text-sm">{selected.bio}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
