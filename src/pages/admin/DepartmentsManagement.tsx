import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Stethoscope, HeartPulse, Brain, Bone, Eye, Ear, Activity, Baby, FlaskConical } from 'lucide-react';
import { departmentsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button } from '../../components/ui';
import { cn } from '../../lib/utils';

const ICONS: Record<string, any> = {
  stethoscope: Stethoscope, heart: HeartPulse, brain: Brain, bone: Bone,
  eye: Eye, ear: Ear, activity: Activity, baby: Baby, flask: FlaskConical, building: Building2,
};

export function DepartmentsManagement() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', floor_number: 1, icon: 'stethoscope', color: '#3B82F6' });

  const { data: departments = [], isLoading } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.getAll });

  const createMutation = useMutation({
    mutationFn: departmentsApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); setShowAdd(false); setForm({ name: '', description: '', floor_number: 1, icon: 'stethoscope', color: '#3B82F6' }); },
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-slate-500">Manage hospital departments</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>Add Department</Button>
      </div>

      {departments.length === 0 ? (
        <EmptyState icon={<Building2 className="w-8 h-8" />} title="No departments" action={<Button onClick={() => setShowAdd(true)}>Add Department</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const Icon = ICONS[dept.icon] || Building2;
            return (
              <div key={dept.id} className="card p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: dept.color + '20', color: dept.color }}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={cn('badge', dept.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500')}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="font-bold text-lg">{dept.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{dept.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span>Floor {dept.floor_number}</span>
                  <span>{dept.room_count} rooms</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Department">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Cardiology" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Floor</label>
              <input type="number" value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input h-11" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input">
              {Object.keys(ICONS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full" loading={createMutation.isPending}>Create Department</Button>
        </form>
      </Modal>
    </div>
  );
}
