import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BedDouble, Plus, Filter, Search, X, UserCircle, Clock } from 'lucide-react';
import { bedsApi, patientsApi } from '../../lib/api';
import { Card, CardHeader, Skeleton, EmptyState, Modal, Button, StatusBadge, Avatar } from '../../components/ui';
import { cn, formatDate } from '../../lib/utils';
import type { Bed, BedStatus, BedType } from '../../types';

const STATUS_COLORS: Record<BedStatus, string> = {
  available: 'bg-emerald-500',
  occupied: 'bg-rose-500',
  reserved: 'bg-amber-500',
  cleaning: 'bg-slate-400',
  maintenance: 'bg-violet-500',
};

const STATUS_BG: Record<BedStatus, string> = {
  available: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  occupied: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
  reserved: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  cleaning: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
  maintenance: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
};

const BED_TYPES: BedType[] = ['general', 'icu', 'emergency', 'private', 'semi_private'];

export function BedManagement() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<BedStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<BedType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [draggedBed, setDraggedBed] = useState<Bed | null>(null);

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ['beds'],
    queryFn: bedsApi.getAll,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientsApi.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Bed> }) => bedsApi.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });

  const filteredBeds = beds.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (typeFilter !== 'all' && b.bed_type !== typeFilter) return false;
    if (search && !b.bed_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    reserved: beds.filter(b => b.status === 'reserved').length,
    cleaning: beds.filter(b => b.status === 'cleaning').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
  };

  const handleDrop = (targetBed: Bed, newStatus: BedStatus) => {
    updateMutation.mutate({ id: targetBed.id, updates: { status: newStatus } });
  };

  const handleAssignPatient = (bed: Bed, patientId: string) => {
    updateMutation.mutate({
      id: bed.id,
      updates: {
        status: 'occupied',
        patient_id: patientId,
        admitted_at: new Date().toISOString(),
      },
    });
    setSelectedBed(null);
  };

  const handleDischarge = (bed: Bed) => {
    updateMutation.mutate({
      id: bed.id,
      updates: {
        status: 'cleaning',
        patient_id: undefined,
        admitted_at: undefined,
        expected_discharge: undefined,
      } as any,
    });
    setSelectedBed(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bed Management</h1>
        <p className="text-slate-500">Drag beds to change status or click to manage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-500' },
          { label: 'Available', value: stats.available, color: 'bg-emerald-500' },
          { label: 'Occupied', value: stats.occupied, color: 'bg-rose-500' },
          { label: 'Reserved', value: stats.reserved, color: 'bg-amber-500' },
          { label: 'Cleaning', value: stats.cleaning, color: 'bg-slate-400' },
          { label: 'Maintenance', value: stats.maintenance, color: 'bg-violet-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bed number..."
            className="input pl-10"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="input w-auto">
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
          <option value="cleaning">Cleaning</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="input w-auto">
          <option value="all">All Types</option>
          {BED_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Drop zones */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['available', 'occupied', 'reserved', 'cleaning', 'maintenance'] as BedStatus[]).map(status => (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (draggedBed) handleDrop(draggedBed, status); setDraggedBed(null); }}
            className={cn('rounded-xl border-2 border-dashed p-3 text-center transition-colors', STATUS_BG[status], 'hover:border-primary-400')}
          >
            <p className="text-xs font-medium capitalize">{status}</p>
            <p className="text-lg font-bold">{beds.filter(b => b.status === status).length}</p>
            <p className="text-xs text-slate-500">Drop here</p>
          </div>
        ))}
      </div>

      {/* Bed Grid */}
      {filteredBeds.length === 0 ? (
        <EmptyState icon={<BedDouble className="w-8 h-8" />} title="No beds found" description="Try adjusting your filters" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredBeds.map((bed) => (
            <div
              key={bed.id}
              draggable
              onDragStart={() => setDraggedBed(bed)}
              onDragEnd={() => setDraggedBed(null)}
              onClick={() => setSelectedBed(bed)}
              className={cn(
                'rounded-xl border-2 p-4 cursor-pointer hover:shadow-lg transition-all relative overflow-hidden',
                STATUS_BG[bed.status],
                draggedBed?.id === bed.id && 'opacity-50'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2 rounded-lg text-white', STATUS_COLORS[bed.status])}>
                  <BedDouble className="w-4 h-4" />
                </div>
                <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLORS[bed.status])} />
              </div>
              <p className="font-bold text-lg">{bed.bed_number}</p>
              <p className="text-xs text-slate-500 capitalize">{bed.bed_type.replace('_', ' ')}</p>
              <p className="text-xs text-slate-500">Floor {bed.floor_number}</p>
              {bed.patient && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium truncate">{bed.patient.profile?.full_name}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bed Detail Modal */}
      <Modal open={!!selectedBed} onClose={() => setSelectedBed(null)} title={`Bed ${selectedBed?.bed_number || ''}`}>
        {selectedBed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <StatusBadge status={selectedBed.status} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <p className="font-medium capitalize">{selectedBed.bed_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Floor</p>
                <p className="font-medium">{selectedBed.floor_number}</p>
              </div>
            </div>

            {selectedBed.patient && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedBed.patient.profile?.full_name || 'Patient'} size="md" />
                  <div>
                    <p className="font-medium">{selectedBed.patient.profile?.full_name}</p>
                    <p className="text-xs text-slate-500">{selectedBed.patient.patient_id}</p>
                  </div>
                </div>
                {selectedBed.admitted_at && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Admitted {formatDate(selectedBed.admitted_at, 'datetime')}
                  </p>
                )}
              </div>
            )}

            {/* Status change */}
            <div>
              <p className="text-sm font-medium mb-2">Change Status</p>
              <div className="grid grid-cols-3 gap-2">
                {(['available', 'occupied', 'reserved', 'cleaning', 'maintenance'] as BedStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => { updateMutation.mutate({ id: selectedBed.id, updates: { status } }); setSelectedBed(null); }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all capitalize',
                      selectedBed.status === status ? STATUS_BG[status] : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign patient */}
            {selectedBed.status === 'available' && (
              <div>
                <p className="text-sm font-medium mb-2">Assign Patient</p>
                <select
                  onChange={(e) => e.target.value && handleAssignPatient(selectedBed, e.target.value)}
                  className="input"
                  defaultValue=""
                >
                  <option value="">Select a patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.profile?.full_name} ({p.patient_id})</option>
                  ))}
                </select>
              </div>
            )}

            {selectedBed.patient && (
              <Button variant="danger" className="w-full" onClick={() => handleDischarge(selectedBed)}>
                Discharge Patient & Mark for Cleaning
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
