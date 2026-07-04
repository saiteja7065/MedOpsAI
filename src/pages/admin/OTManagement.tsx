import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stethoscope, Plus, Clock, User, Activity, Calendar } from 'lucide-react';
import { otsApi, doctorsApi, patientsApi } from '../../lib/api';
import { Card, CardHeader, Skeleton, EmptyState, Modal, Button, StatusBadge } from '../../components/ui';
import { cn, formatDate } from '../../lib/utils';
import type { OTStatus, OperationTheatre } from '../../types';

const STATUS_COLORS: Record<OTStatus, string> = {
  available: 'from-emerald-500 to-teal-500',
  occupied: 'from-rose-500 to-pink-500',
  maintenance: 'from-amber-500 to-orange-500',
  cleaning: 'from-slate-400 to-slate-500',
  emergency: 'from-red-500 to-rose-600',
};

export function OTManagement() {
  const queryClient = useQueryClient();
  const [selectedOT, setSelectedOT] = useState<OperationTheatre | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: ots = [], isLoading } = useQuery({ queryKey: ['ots'], queryFn: otsApi.getAll });
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors'], queryFn: () => doctorsApi.getAll() });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => patientsApi.getAll() });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OperationTheatre> }) => otsApi.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ots'] }),
  });

  const stats = {
    total: ots.length,
    available: ots.filter(o => o.status === 'available').length,
    occupied: ots.filter(o => o.status === 'occupied').length,
    maintenance: ots.filter(o => o.status === 'maintenance').length,
    emergency: ots.filter(o => o.status === 'emergency').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operation Theatres</h1>
          <p className="text-slate-500">Manage surgery schedules and OT allocation</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add OT</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-500' },
          { label: 'Available', value: stats.available, color: 'bg-emerald-500' },
          { label: 'Occupied', value: stats.occupied, color: 'bg-rose-500' },
          { label: 'Maintenance', value: stats.maintenance, color: 'bg-amber-500' },
          { label: 'Emergency', value: stats.emergency, color: 'bg-red-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {ots.length === 0 ? (
        <EmptyState icon={<Stethoscope className="w-8 h-8" />} title="No operation theatres" description="Add your first OT to get started" action={<Button onClick={() => setShowAdd(true)}>Add OT</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ots.map(ot => (
            <div
              key={ot.id}
              onClick={() => setSelectedOT(ot)}
              className="card p-5 cursor-pointer hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn('p-3 rounded-xl bg-gradient-to-br text-white', STATUS_COLORS[ot.status])}>
                  <Stethoscope className="w-5 h-5" />
                </div>
                <StatusBadge status={ot.status} />
              </div>
              <h3 className="font-bold text-lg">{ot.ot_number}</h3>
              <p className="text-sm text-slate-500">{ot.name}</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Capacity: {ot.capacity}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Floor {ot.floor_number}</span>
                </div>
                {ot.current_doctor && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{ot.current_doctor.profile?.full_name}</span>
                  </div>
                )}
                {ot.surgery_type && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>{ot.surgery_type}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OT Detail Modal */}
      <Modal open={!!selectedOT} onClose={() => setSelectedOT(null)} title={`OT ${selectedOT?.ot_number || ''}`}>
        {selectedOT && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium">{selectedOT.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <StatusBadge status={selectedOT.status} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Floor</p>
                <p className="font-medium">{selectedOT.floor_number}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Capacity</p>
                <p className="font-medium">{selectedOT.capacity}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Change Status</p>
              <div className="grid grid-cols-3 gap-2">
                {(['available', 'occupied', 'maintenance', 'cleaning', 'emergency'] as OTStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => { updateMutation.mutate({ id: selectedOT.id, updates: { status } }); setSelectedOT(null); }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all capitalize',
                      selectedOT.status === status ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Assign Doctor</p>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    updateMutation.mutate({ id: selectedOT.id, updates: { current_doctor_id: e.target.value, status: 'occupied' } });
                    setSelectedOT(null);
                  }
                }}
                className="input"
                defaultValue={selectedOT.current_doctor_id || ''}
              >
                <option value="">Select a doctor...</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.profile?.full_name} - {d.specialization}</option>)}
              </select>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Schedule Surgery</p>
              <input
                type="text"
                placeholder="Surgery type (e.g., Appendectomy)"
                defaultValue={selectedOT.surgery_type || ''}
                onChange={(e) => updateMutation.mutate({ id: selectedOT.id, updates: { surgery_type: e.target.value } })}
                className="input mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  defaultValue={selectedOT.scheduled_start ? selectedOT.scheduled_start.slice(0, 16) : ''}
                  onChange={(e) => updateMutation.mutate({ id: selectedOT.id, updates: { scheduled_start: e.target.value } })}
                  className="input"
                />
                <input
                  type="datetime-local"
                  defaultValue={selectedOT.scheduled_end ? selectedOT.scheduled_end.slice(0, 16) : ''}
                  onChange={(e) => updateMutation.mutate({ id: selectedOT.id, updates: { scheduled_end: e.target.value } })}
                  className="input"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add OT Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Operation Theatre">
        <AddOTForm onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}

function AddOTForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ot_number: '', name: '', floor_number: 1, capacity: 5 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await otsApi.create(form);
      queryClient.invalidateQueries({ queryKey: ['ots'] });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">OT Number</label>
        <input value={form.ot_number} onChange={(e) => setForm({ ...form, ot_number: e.target.value })} className="input" placeholder="OT-001" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="General Surgery OT" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Floor</label>
          <input type="number" value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: Number(e.target.value) })} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Capacity</label>
          <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="input" />
        </div>
      </div>
      <Button type="submit" className="w-full" loading={loading}>Create OT</Button>
    </form>
  );
}
