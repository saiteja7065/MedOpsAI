
/*
# Medical Coding & Claims Automation

1. New Tables
   - `payer_rules` - Lightweight payer/insurance rule set used to validate claims
     (stands in for the brief's "RAG over payer rules" — a small rule table
     queried directly rather than a vector store, sized for a hackathon demo)
   - `coding_suggestions` - AI-suggested ICD-10/CPT codes generated from a
     doctor's clinical note, with per-code confidence + rationale, and the
     human-confirmed final code set
   - `claims` - Insurance claims built from confirmed codes, carrying
     validation results and a denial-risk assessment
   - `claim_audit_log` - Immutable log of every status change on a claim,
     written by a trigger so it can't be bypassed by application code

2. Security
   - RLS enabled on all four tables
   - Doctors see/manage suggestions and claims for their own patients
   - Patients can read (not write) their own claims
   - Admins have full oversight (financial approval role)

3. Important Notes
   - `claims.status` transitions are logged automatically via trigger,
     giving an audit trail for "accurate, auditable financial actions"
   - Denial-risk scoring is deterministic/rule-based for explainability;
     the paired Groq call (in the validate-claim edge function) only
     phrases the rationale, it does not decide the score
*/

-- PAYER RULES TABLE
CREATE TABLE IF NOT EXISTS payer_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_name text NOT NULL DEFAULT 'default',
  rule_type text NOT NULL CHECK (rule_type IN ('required_field', 'max_amount', 'code_format', 'documentation')),
  rule_key text NOT NULL,
  rule_value jsonb NOT NULL DEFAULT '{}',
  description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payer_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payer_rules_select" ON payer_rules;
CREATE POLICY "payer_rules_select" ON payer_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payer_rules_insert" ON payer_rules;
CREATE POLICY "payer_rules_insert" ON payer_rules FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "payer_rules_update" ON payer_rules;
CREATE POLICY "payer_rules_update" ON payer_rules FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "payer_rules_delete" ON payer_rules;
CREATE POLICY "payer_rules_delete" ON payer_rules FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- CODING SUGGESTIONS TABLE
CREATE TABLE IF NOT EXISTS coding_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinical_note_id uuid NOT NULL REFERENCES clinical_notes(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid NOT NULL REFERENCES doctors(id),
  input_text text NOT NULL,
  model text NOT NULL DEFAULT 'groq',
  suggested_codes jsonb NOT NULL DEFAULT '[]',
  confirmed_codes jsonb,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'rejected')) DEFAULT 'pending',
  confirmed_by uuid REFERENCES profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coding_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coding_suggestions_select" ON coding_suggestions;
CREATE POLICY "coding_suggestions_select" ON coding_suggestions FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = coding_suggestions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM patients WHERE id = coding_suggestions.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coding_suggestions_insert" ON coding_suggestions;
CREATE POLICY "coding_suggestions_insert" ON coding_suggestions FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM doctors WHERE id = coding_suggestions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coding_suggestions_update" ON coding_suggestions;
CREATE POLICY "coding_suggestions_update" ON coding_suggestions FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = coding_suggestions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "coding_suggestions_delete" ON coding_suggestions;
CREATE POLICY "coding_suggestions_delete" ON coding_suggestions FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number text UNIQUE NOT NULL,
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid NOT NULL REFERENCES doctors(id),
  coding_suggestion_id uuid REFERENCES coding_suggestions(id),
  icd_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  cpt_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  diagnosis_summary text,
  billed_amount numeric(10,2) NOT NULL DEFAULT 0,
  insurance_provider text,
  insurance_number text,
  status text NOT NULL CHECK (status IN ('draft', 'validated', 'needs_review', 'submitted', 'approved', 'denied')) DEFAULT 'draft',
  validation_errors jsonb NOT NULL DEFAULT '[]',
  denial_risk_score numeric(5,2),
  denial_risk_reasons jsonb NOT NULL DEFAULT '[]',
  denial_risk_rationale text,
  denial_reason text,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES profiles(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_select" ON claims;
CREATE POLICY "claims_select" ON claims FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = claims.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM patients WHERE id = claims.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "claims_insert" ON claims;
CREATE POLICY "claims_insert" ON claims FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM doctors WHERE id = claims.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "claims_update" ON claims;
CREATE POLICY "claims_update" ON claims FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = claims.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "claims_delete" ON claims;
CREATE POLICY "claims_delete" ON claims FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE OR REPLACE TRIGGER claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- CLAIM AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS claim_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  actor_role text,
  action text NOT NULL,
  from_status text,
  to_status text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE claim_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claim_audit_log_select" ON claim_audit_log;
CREATE POLICY "claim_audit_log_select" ON claim_audit_log FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM claims c JOIN doctors d ON d.id = c.doctor_id WHERE c.id = claim_audit_log.claim_id AND d.profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM claims c JOIN patients p ON p.id = c.patient_id WHERE c.id = claim_audit_log.claim_id AND p.profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Only the trigger (SECURITY DEFINER) writes audit rows — no direct insert/update/delete policy
-- is granted to any role, so the log cannot be edited or bypassed from the client.

-- AUTO-LOG CLAIM STATUS CHANGES
CREATE OR REPLACE FUNCTION log_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role text;
BEGIN
  SELECT role INTO v_actor_role FROM profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO claim_audit_log (claim_id, actor_id, actor_role, action, from_status, to_status, details)
    VALUES (NEW.id, auth.uid(), v_actor_role, 'created', NULL, NEW.status, jsonb_build_object('claim_number', NEW.claim_number));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO claim_audit_log (claim_id, actor_id, actor_role, action, from_status, to_status, details)
    VALUES (
      NEW.id, auth.uid(), v_actor_role, 'status_changed', OLD.status, NEW.status,
      jsonb_build_object(
        'denial_risk_score', NEW.denial_risk_score,
        'denial_reason', NEW.denial_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS claims_audit_trigger ON claims;
CREATE TRIGGER claims_audit_trigger
  AFTER INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION log_claim_status_change();

-- SEED DEMO PAYER RULES (stand-in rule set validated against at claim time)
INSERT INTO payer_rules (payer_name, rule_type, rule_key, rule_value, description) VALUES
  ('default', 'required_field', 'insurance_number', '{}', 'Claim must have a valid insurance/policy number on file'),
  ('default', 'required_field', 'diagnosis_summary', '{}', 'Claim must include a diagnosis summary linked to the billed codes'),
  ('default', 'max_amount', 'billed_amount', '{"max": 50000}', 'Single claim amount must not exceed 50,000 without manual review'),
  ('default', 'code_format', 'icd_codes', '{"pattern": "^[A-TV-Z][0-9][0-9AB](\\.[0-9A-TV-Z]{1,4})?$"}', 'ICD-10 codes must match standard ICD-10-CM format'),
  ('default', 'code_format', 'cpt_codes', '{"pattern": "^[0-9]{5}$"}', 'CPT codes must be 5 digits'),
  ('default', 'documentation', 'code_count', '{"min": 1}', 'At least one diagnosis code is required to submit a claim')
ON CONFLICT DO NOTHING;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_coding_suggestions_appointment ON coding_suggestions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_coding_suggestions_doctor ON coding_suggestions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_doctor ON claims(doctor_id);
CREATE INDEX IF NOT EXISTS idx_claim_audit_log_claim ON claim_audit_log(claim_id);
