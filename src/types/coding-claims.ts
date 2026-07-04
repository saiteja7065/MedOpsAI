import type { Patient, Doctor } from './people';
import type { Appointment } from './appointments';

export type CodeType = 'ICD-10' | 'CPT';
export type CodingSuggestionStatus = 'pending' | 'confirmed' | 'rejected';
export type ClaimStatus = 'draft' | 'validated' | 'needs_review' | 'submitted' | 'approved' | 'denied';

export interface SuggestedCode {
  code: string;
  code_type: CodeType;
  description: string;
  confidence: number;
  rationale: string;
}

export interface CodingSuggestion {
  id: string;
  clinical_note_id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  input_text: string;
  model: string;
  suggested_codes: SuggestedCode[];
  confirmed_codes?: SuggestedCode[];
  status: CodingSuggestionStatus;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Claim {
  id: string;
  claim_number: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  coding_suggestion_id?: string;
  icd_codes: string[];
  cpt_codes: string[];
  diagnosis_summary?: string;
  billed_amount: number;
  insurance_provider?: string;
  insurance_number?: string;
  status: ClaimStatus;
  validation_errors: string[];
  denial_risk_score?: number;
  denial_risk_reasons: string[];
  denial_risk_rationale?: string;
  denial_reason?: string;
  submitted_at?: string;
  submitted_by?: string;
  decided_at?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
  appointment?: Appointment;
}

export interface ClaimAuditLog {
  id: string;
  claim_id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  from_status?: string;
  to_status?: string;
  details?: any;
  created_at: string;
}

export interface PayerRule {
  id: string;
  payer_name: string;
  rule_type: 'required_field' | 'max_amount' | 'code_format' | 'documentation';
  rule_key: string;
  rule_value: any;
  description: string;
  is_active: boolean;
  created_at: string;
}
