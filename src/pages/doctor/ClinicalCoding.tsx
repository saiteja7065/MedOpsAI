import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Sparkles, FileCheck2, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { doctorsApi, appointmentsApi, clinicalNotesApi, codingApi, claimsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button, StatusBadge, Avatar, Badge } from '../../components/ui';
import { formatDate, cn } from '../../lib/utils';
import type { Appointment, ClinicalNote, SuggestedCode } from '../../types';

export function ClinicalCoding() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Appointment | null>(null);

  const { data: doctor } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: () => doctorsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments-for-coding', doctor?.id],
    queryFn: () => appointmentsApi.getAll({ doctor_id: doctor!.id }),
    enabled: !!doctor,
  });

  const codable = appointments.filter(a => ['in_progress', 'completed'].includes(a.status));

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">Medical Coding <Sparkles className="w-5 h-5 text-primary-500" /></h1>
        <p className="text-slate-500">Write a clinical note, get AI-suggested ICD-10/CPT codes, confirm them, and raise a claim</p>
      </div>

      {codable.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-8 h-8" />} title="Nothing to code yet" description="Appointments become codable once they're in progress or completed" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {codable.map(appt => (
            <div key={appt.id} className="card p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => setSelected(appt)}>
              <div className="flex items-start justify-between mb-3">
                <Avatar name={appt.patient?.profile?.full_name || 'P'} size="md" />
                <StatusBadge status={appt.status} />
              </div>
              <h3 className="font-semibold truncate">{appt.patient?.profile?.full_name}</h3>
              <p className="text-xs text-slate-500 mt-1">{appt.appointment_number} • {formatDate(appt.appointment_date)}</p>
              <p className="text-xs text-slate-500 truncate mt-1">{appt.reason}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Coding — ${selected.patient?.profile?.full_name}` : ''} size="xl">
        {selected && <CodingWorkspace appointment={selected} doctorId={doctor!.id} userId={user!.id} onClose={() => { setSelected(null); queryClient.invalidateQueries({ queryKey: ['doctor-appointments-for-coding'] }); }} />}
      </Modal>
    </div>
  );
}

function CodingWorkspace({ appointment, doctorId, userId, onClose }: { appointment: Appointment; doctorId: string; userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    chief_complaint: '',
    examination_findings: '',
    diagnosis: appointment.reason || '',
    treatment_plan: '',
    tests_ordered: '',
    notes: '',
  });
  const [selectedCodes, setSelectedCodes] = useState<Record<number, boolean>>({});
  const [billedAmount, setBilledAmount] = useState(String(appointment.fee || 0));

  const { data: existingNote } = useQuery({
    queryKey: ['clinical-note', appointment.id],
    queryFn: () => clinicalNotesApi.getByAppointment(appointment.id),
  });

  const note: ClinicalNote | null | undefined = existingNote;

  const { data: suggestions = [], refetch: refetchSuggestions } = useQuery({
    queryKey: ['coding-suggestions', appointment.id],
    queryFn: () => codingApi.getByAppointment(appointment.id),
    enabled: !!note,
  });

  const latestSuggestion = suggestions[0];

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appointment_id: appointment.id,
        doctor_id: doctorId,
        patient_id: appointment.patient_id,
        chief_complaint: form.chief_complaint,
        examination_findings: form.examination_findings,
        diagnosis: form.diagnosis,
        treatment_plan: form.treatment_plan,
        tests_ordered: form.tests_ordered ? form.tests_ordered.split(',').map(s => s.trim()).filter(Boolean) : [],
        notes: form.notes,
      };
      if (note) return clinicalNotesApi.update(note.id, payload);
      return clinicalNotesApi.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinical-note', appointment.id] }),
  });

  const suggestMutation = useMutation({
    mutationFn: () => codingApi.suggest(note!.id),
    onSuccess: (result) => {
      const defaults: Record<number, boolean> = {};
      result.suggested_codes.forEach((c, i) => { defaults[i] = c.confidence >= 0.6; });
      setSelectedCodes(defaults);
      refetchSuggestions();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const chosen = latestSuggestion.suggested_codes.filter((_, i) => selectedCodes[i]);
      return codingApi.confirm(latestSuggestion.id, chosen, userId);
    },
    onSuccess: () => refetchSuggestions(),
  });

  const [claimCreated, setClaimCreated] = useState<string | null>(null);
  const createClaimMutation = useMutation({
    mutationFn: async () => {
      const confirmed = latestSuggestion.confirmed_codes || [];
      const icd = confirmed.filter(c => c.code_type === 'ICD-10').map(c => c.code);
      const cpt = confirmed.filter(c => c.code_type === 'CPT').map(c => c.code);
      return claimsApi.create({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        doctor_id: doctorId,
        coding_suggestion_id: latestSuggestion.id,
        icd_codes: icd,
        cpt_codes: cpt,
        diagnosis_summary: form.diagnosis || note?.diagnosis,
        billed_amount: Number(billedAmount) || 0,
      });
    },
    onSuccess: (claim) => setClaimCreated(claim.claim_number),
  });

  return (
    <div className="space-y-6">
      {/* Clinical note */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Clinical Note</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <textarea className="input min-h-[70px]" placeholder="Chief complaint" value={form.chief_complaint} onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} />
          <textarea className="input min-h-[70px]" placeholder="Examination findings" value={form.examination_findings} onChange={e => setForm(f => ({ ...f, examination_findings: e.target.value }))} />
          <textarea className="input min-h-[70px]" placeholder="Diagnosis" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
          <textarea className="input min-h-[70px]" placeholder="Treatment plan" value={form.treatment_plan} onChange={e => setForm(f => ({ ...f, treatment_plan: e.target.value }))} />
          <input className="input" placeholder="Tests ordered (comma separated)" value={form.tests_ordered} onChange={e => setForm(f => ({ ...f, tests_ordered: e.target.value }))} />
          <input className="input" placeholder="Additional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <Button className="mt-3" size="sm" loading={saveNoteMutation.isPending} onClick={() => saveNoteMutation.mutate()}>
          {note ? 'Update Note' : 'Save Note'}
        </Button>
      </div>

      {/* AI coding */}
      {note && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary-500" /> AI Coding Suggestions</h3>
            <Button size="sm" variant="secondary" loading={suggestMutation.isPending} onClick={() => suggestMutation.mutate()}>
              {latestSuggestion ? 'Re-run Suggestions' : 'Suggest Billing Codes'}
            </Button>
          </div>

          {suggestMutation.isError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {(suggestMutation.error as Error).message}
            </div>
          )}

          {latestSuggestion && (
            <div className="space-y-2">
              {latestSuggestion.status === 'confirmed' && (
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Codes confirmed
                </div>
              )}
              {latestSuggestion.suggested_codes.length === 0 ? (
                <p className="text-sm text-slate-500">The note didn't have enough detail to support a coding suggestion.</p>
              ) : latestSuggestion.suggested_codes.map((c: SuggestedCode, i: number) => (
                <label key={i} className={cn('flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                  selectedCodes[i] ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/10 dark:border-primary-800' : 'border-slate-200 dark:border-slate-700')}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!selectedCodes[i]}
                    disabled={latestSuggestion.status === 'confirmed'}
                    onChange={e => setSelectedCodes(s => ({ ...s, [i]: e.target.checked }))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={c.code_type === 'ICD-10' ? 'info' : 'default'}>{c.code_type}</Badge>
                      <span className="font-mono font-semibold">{c.code}</span>
                      <span className="text-sm">{c.description}</span>
                      <span className="text-xs text-slate-400 ml-auto">{Math.round(c.confidence * 100)}% confidence</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 italic">"{c.rationale}"</p>
                  </div>
                </label>
              ))}
              {latestSuggestion.suggested_codes.length > 0 && latestSuggestion.status !== 'confirmed' && (
                <Button size="sm" loading={confirmMutation.isPending} onClick={() => confirmMutation.mutate()} disabled={!Object.values(selectedCodes).some(Boolean)}>
                  Confirm Selected Codes
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Claim */}
      {latestSuggestion?.status === 'confirmed' && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Receipt className="w-4 h-4" /> Raise Claim</h3>
          {claimCreated ? (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm">
              Claim <span className="font-mono font-semibold">{claimCreated}</span> created as a draft. An admin will validate and submit it from Claims Management.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Billed amount (₹)</label>
                <input className="input" type="number" value={billedAmount} onChange={e => setBilledAmount(e.target.value)} />
              </div>
              <Button loading={createClaimMutation.isPending} onClick={() => createClaimMutation.mutate()}>Create Claim</Button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
