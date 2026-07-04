import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Search, ShieldCheck, Send, CheckCircle2, XCircle, AlertTriangle, History, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { claimsApi } from '../../lib/api';
import { Card, Skeleton, EmptyState, Modal, Button, Badge, Avatar } from '../../components/ui';
import { formatDate, formatCurrency, cn, timeAgo } from '../../lib/utils';
import type { Claim, ClaimStatus } from '../../types';

const STATUS_VARIANT: Record<ClaimStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  draft: 'neutral',
  validated: 'info',
  needs_review: 'warning',
  submitted: 'default',
  approved: 'success',
  denied: 'danger',
};

function riskColor(score?: number) {
  if (score === undefined || score === null) return 'text-slate-400';
  if (score >= 60) return 'text-rose-600 dark:text-rose-400';
  if (score >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

export function ClaimsManagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Claim | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims', statusFilter],
    queryFn: () => claimsApi.getAll(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['claim-audit', selected?.id],
    queryFn: () => claimsApi.getAuditLog(selected!.id),
    enabled: !!selected,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['claims'] });
    queryClient.invalidateQueries({ queryKey: ['claim-audit'] });
  };

  const validateMutation = useMutation({
    mutationFn: (id: string) => claimsApi.validate(id),
    onSuccess: (claim) => { setSelected(claim); invalidate(); },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => claimsApi.submit(id, user!.id),
    onSuccess: (claim) => { setSelected(claim); invalidate(); },
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'approved' | 'denied'; reason?: string }) => claimsApi.decide(id, decision, reason),
    onSuccess: (claim) => { setSelected(claim); setShowDenyInput(false); setDenyReason(''); invalidate(); },
  });

  const filtered = claims.filter(c =>
    !search ||
    c.claim_number.toLowerCase().includes(search.toLowerCase()) ||
    c.patient?.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    all: claims.length,
    draft: claims.filter(c => c.status === 'draft').length,
    needs_review: claims.filter(c => c.status === 'needs_review').length,
    submitted: claims.filter(c => c.status === 'submitted').length,
    denied: claims.filter(c => c.status === 'denied').length,
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">Claims <Receipt className="w-5 h-5 text-primary-500" /></h1>
        <p className="text-slate-500">Validate, submit, and track insurance claims raised from doctor coding</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: counts.all, key: 'all' as const },
          { label: 'Draft', value: counts.draft, key: 'draft' as const },
          { label: 'Needs Review', value: counts.needs_review, key: 'needs_review' as const },
          { label: 'Submitted', value: counts.submitted, key: 'submitted' as const },
          { label: 'Denied', value: counts.denied, key: 'denied' as const },
        ].map(s => (
          <button key={s.label} onClick={() => setStatusFilter(s.key)} className={cn('card p-4 text-left transition-all', statusFilter === s.key && 'ring-2 ring-primary-500')}>
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by claim number or patient..." className="input pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Receipt className="w-8 h-8" />} title="No claims found" description="Claims created from doctor coding will appear here" />
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => (
            <div key={claim.id} className="card p-4 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelected(claim)}>
              <div className="flex items-center gap-4">
                <Avatar name={claim.patient?.profile?.full_name || 'P'} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono font-medium">{claim.claim_number}</span>
                    <Badge variant={STATUS_VARIANT[claim.status]}>{claim.status.replace('_', ' ')}</Badge>
                    {claim.denial_risk_score !== undefined && claim.denial_risk_score !== null && (
                      <span className={cn('text-xs font-semibold', riskColor(claim.denial_risk_score))}>
                        Risk {claim.denial_risk_score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{claim.patient?.profile?.full_name} → Dr. {claim.doctor?.profile?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{[...claim.icd_codes, ...claim.cpt_codes].join(', ') || 'No codes attached'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold">{formatCurrency(claim.billed_amount)}</p>
                  <p className="text-xs text-slate-400">{timeAgo(claim.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => { setSelected(null); setShowDenyInput(false); }} title={selected ? `Claim ${selected.claim_number}` : ''} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Badge variant={STATUS_VARIANT[selected.status]}>{selected.status.replace('_', ' ')}</Badge>
              {selected.denial_risk_score !== undefined && selected.denial_risk_score !== null && (
                <span className={cn('text-sm font-semibold', riskColor(selected.denial_risk_score))}>
                  Denial risk: {selected.denial_risk_score}/100
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-slate-500">Patient</p><p className="font-medium">{selected.patient?.profile?.full_name}</p></div>
              <div><p className="text-sm text-slate-500">Doctor</p><p className="font-medium">{selected.doctor?.profile?.full_name}</p></div>
              <div><p className="text-sm text-slate-500">Billed Amount</p><p className="font-medium">{formatCurrency(selected.billed_amount)}</p></div>
              <div><p className="text-sm text-slate-500">Created</p><p className="font-medium">{formatDate(selected.created_at, 'long')}</p></div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-1">Codes</p>
              <div className="flex flex-wrap gap-2">
                {selected.icd_codes.map(c => <Badge key={c} variant="info">ICD {c}</Badge>)}
                {selected.cpt_codes.map(c => <Badge key={c} variant="default">CPT {c}</Badge>)}
                {selected.icd_codes.length === 0 && selected.cpt_codes.length === 0 && <span className="text-sm text-slate-400">None</span>}
              </div>
            </div>

            {selected.diagnosis_summary && (
              <div><p className="text-sm text-slate-500 mb-1">Diagnosis Summary</p><p className="text-sm">{selected.diagnosis_summary}</p></div>
            )}

            {selected.validation_errors?.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Validation Findings</p>
                <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                  {selected.validation_errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {selected.denial_risk_rationale && (
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <p className="text-sm font-medium flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-primary-600" /> AI Risk Rationale</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selected.denial_risk_rationale}</p>
              </div>
            )}

            {selected.status === 'denied' && selected.denial_reason && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-sm text-rose-700 dark:text-rose-300">
                <span className="font-medium">Denial reason: </span>{selected.denial_reason}
              </div>
            )}

            {/* Actions — financial actions require an explicit human click at every step */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {(selected.status === 'draft' || selected.status === 'needs_review') && (
                <Button icon={<ShieldCheck className="w-4 h-4" />} loading={validateMutation.isPending} onClick={() => validateMutation.mutate(selected.id)}>
                  {selected.status === 'needs_review' ? 'Re-validate' : 'Validate Claim'}
                </Button>
              )}
              {selected.status === 'validated' && (
                <Button icon={<Send className="w-4 h-4" />} loading={submitMutation.isPending} onClick={() => submitMutation.mutate(selected.id)}>
                  Submit Claim
                </Button>
              )}
              {selected.status === 'submitted' && !showDenyInput && (
                <>
                  <Button variant="success" icon={<CheckCircle2 className="w-4 h-4" />} loading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: selected.id, decision: 'approved' })}>
                    Mark Approved <span className="opacity-70 font-normal">(simulated payer response)</span>
                  </Button>
                  <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setShowDenyInput(true)}>
                    Mark Denied
                  </Button>
                </>
              )}
              {showDenyInput && (
                <div className="w-full flex gap-2">
                  <input className="input flex-1" placeholder="Denial reason..." value={denyReason} onChange={e => setDenyReason(e.target.value)} />
                  <Button variant="danger" disabled={!denyReason.trim()} loading={decideMutation.isPending} onClick={() => decideMutation.mutate({ id: selected.id, decision: 'denied', reason: denyReason })}>
                    Confirm Denial
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDenyInput(false)}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Audit trail */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm font-medium flex items-center gap-2 mb-2"><History className="w-4 h-4" /> Audit Trail</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {auditLog.length === 0 ? (
                  <p className="text-xs text-slate-400">No history yet</p>
                ) : auditLog.map(entry => (
                  <div key={entry.id} className="text-xs flex items-center justify-between text-slate-500">
                    <span>{entry.action === 'created' ? 'Claim created' : `${entry.from_status} → ${entry.to_status}`} {entry.actor_role ? `by ${entry.actor_role}` : ''}</span>
                    <span>{timeAgo(entry.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
