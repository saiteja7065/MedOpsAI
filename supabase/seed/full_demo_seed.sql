-- Full jury-demo seed. Run this AFTER demo_seed.sql, historical_appointments_seed.sql,
-- and beds_ots_seed.sql. Uses only the 3 existing verify.*@medops.test accounts —
-- no new signups needed. Safe to re-run (unique constraints + ON CONFLICT guards).
--
-- What this adds:
--   1. Four more departments + health problems (so Book Appointment / Departments
--      pages show variety, not just Internal Medicine)
--   2. Two weeks of staff shifts for the existing doctor
--   3. Six claims spanning every status (draft, validated, needs_review, submitted,
--      approved, denied) with real-shaped clinical notes + coding suggestions behind
--      each one, so Admin > Claims isn't empty
--   4. Two pre-analyzed medical report fixtures (for an instantly-populated demo —
--      still do ONE real upload live during the jury demo for the actual "wow" of
--      watching the real Groq vision call happen)
--   5. A few notifications so the bell icon isn't empty
--   6. Two completed past video consultations (drives the "Video
--      Consultations" stat, which counts appointments.type='video')

-- ============ 1. More departments + health problems ============
INSERT INTO departments (name, description, floor_number, icon, color) VALUES
  ('Cardiology', 'Heart and cardiovascular care', 1, 'heart-pulse', '#ef4444'),
  ('Neurology', 'Brain and nervous system', 3, 'brain', '#8b5cf6'),
  ('Orthopedics', 'Bones, joints and muscles', 2, 'bone', '#f59e0b'),
  ('Pediatrics', 'Child healthcare', 1, 'baby', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

INSERT INTO health_problems (name, description, department_id, icon, category)
SELECT hp.name, hp.description, d.id, hp.icon, hp.category
FROM (VALUES
  ('Chest Pain', 'Pain or discomfort in the chest', 'Cardiology', 'heart-pulse', 'cardiac'),
  ('Heart Palpitations', 'Irregular or racing heartbeat', 'Cardiology', 'heart-pulse', 'cardiac'),
  ('Severe Headache', 'Persistent or severe headaches', 'Neurology', 'brain', 'neurological'),
  ('Joint Pain', 'Pain in knees, hips, shoulders', 'Orthopedics', 'bone', 'orthopedic'),
  ('Child Fever', 'Fever in children', 'Pediatrics', 'thermometer', 'pediatrics')
) AS hp(name, description, dept_name, icon, category)
JOIN departments d ON d.name = hp.dept_name
ON CONFLICT (name) DO NOTHING;

-- ============ 2. Staff shifts (current + next week, Mon-Fri, AM+PM) ============
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01')
INSERT INTO staff_shifts (doctor_id, department_id, shift_date, shift_type)
SELECT doc.doctor_id, doc.department_id, d::date, s.shift_type
FROM doc
CROSS JOIN generate_series(
  date_trunc('week', CURRENT_DATE)::date,
  date_trunc('week', CURRENT_DATE)::date + 11,
  interval '1 day'
) AS d
CROSS JOIN (VALUES ('morning'), ('evening')) AS s(shift_type)
WHERE extract(isodow FROM d) BETWEEN 1 AND 5
ON CONFLICT (doctor_id, shift_date, shift_type) DO NOTHING;

-- ============ 3. Claims across every status ============

-- 3a. DRAFT — just coded and confirmed, not yet touched by admin
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CLM-DRAFT', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 1, '09:30', 'in_person', 'completed', 'normal', 'Follow-up for seasonal allergy symptoms', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan)
       SELECT id, doctor_id, patient_id, 'Sneezing, itchy eyes, nasal congestion for 5 days', 'Nasal mucosa mildly swollen, no fever', 'Allergic rhinitis', 'Start cetirizine 10mg once daily, avoid known allergens'
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Allergic rhinitis. Chief complaint: Sneezing, itchy eyes, nasal congestion for 5 days.',
         'llama-3.3-70b-versatile',
         '[{"code":"J30.9","code_type":"ICD-10","description":"Allergic rhinitis, unspecified","confidence":0.88,"rationale":"Diagnosis: Allergic rhinitis."},{"code":"99213","code_type":"CPT","description":"Established patient office visit","confidence":0.85,"rationale":"Follow-up visit."}]'::jsonb,
         '[{"code":"J30.9","code_type":"ICD-10","description":"Allergic rhinitis, unspecified","confidence":0.88,"rationale":"Diagnosis: Allergic rhinitis."},{"code":"99213","code_type":"CPT","description":"Established patient office visit","confidence":0.85,"rationale":"Follow-up visit."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status)
SELECT 'CLM-DEMO-DRAFT', appointment_id, patient_id, doctor_id, id, ARRAY['J30.9'], ARRAY['99213'], 'Allergic rhinitis, new episode.', 500, 'draft'
FROM new_coding
ON CONFLICT (claim_number) DO NOTHING;

-- 3b. VALIDATED — clean claim, low risk, ready to submit
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CLM-VALID', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 3, '10:00', 'in_person', 'completed', 'normal', 'Diabetes and hypertension follow-up', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan, vitals)
       SELECT id, doctor_id, patient_id, 'Follow-up for diabetes and hypertension', 'BP 142/90, HbA1c elevated', 'Type 2 diabetes mellitus, controlled. Essential hypertension.', 'Continue metformin, monitor BP', '{"bp":"142/90"}'::jsonb
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Type 2 diabetes mellitus, controlled. Essential hypertension.',
         'llama-3.3-70b-versatile',
         '[{"code":"E11.9","code_type":"ICD-10","description":"Type 2 diabetes mellitus without complications","confidence":0.9,"rationale":"Diagnosis: Type 2 diabetes mellitus, controlled."},{"code":"I10","code_type":"ICD-10","description":"Essential (primary) hypertension","confidence":0.88,"rationale":"Essential hypertension."},{"code":"99213","code_type":"CPT","description":"Established patient office visit","confidence":0.85,"rationale":"Follow-up visit."}]'::jsonb,
         '[{"code":"E11.9","code_type":"ICD-10","description":"Type 2 diabetes mellitus without complications","confidence":0.9,"rationale":"Diagnosis: Type 2 diabetes mellitus, controlled."},{"code":"I10","code_type":"ICD-10","description":"Essential (primary) hypertension","confidence":0.88,"rationale":"Essential hypertension."},{"code":"99213","code_type":"CPT","description":"Established patient office visit","confidence":0.85,"rationale":"Follow-up visit."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale)
SELECT 'CLM-DEMO-VALID', appointment_id, patient_id, doctor_id, id, ARRAY['E11.9','I10'], ARRAY['99213'], 'Type 2 diabetes mellitus, controlled; essential hypertension.', 500, 'validated', '[]', 8, '[]', 'This claim passed automated validation with no errors and a low denial-risk score of 8/100, reflecting complete documentation and correctly formatted codes.'
FROM new_coding
ON CONFLICT (claim_number) DO NOTHING;

-- 3c. NEEDS_REVIEW — missing diagnosis summary + malformed CPT code
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CLM-REVIEW', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 5, '11:00', 'in_person', 'completed', 'normal', 'Acute lower back pain after lifting', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan)
       SELECT id, doctor_id, patient_id, 'Lower back pain after lifting a heavy box, 2 days ago', 'Paraspinal tenderness, no neuro deficit', 'Lumbar strain', 'NSAIDs, rest, physiotherapy referral'
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Lumbar strain.',
         'llama-3.3-70b-versatile',
         '[{"code":"S39.012A","code_type":"ICD-10","description":"Strain of muscle, lower back, initial encounter","confidence":0.75,"rationale":"Diagnosis: Lumbar strain."}]'::jsonb,
         '[{"code":"S39.012A","code_type":"ICD-10","description":"Strain of muscle, lower back, initial encounter","confidence":0.75,"rationale":"Diagnosis: Lumbar strain."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale)
SELECT 'CLM-DEMO-REVIEW', appointment_id, patient_id, doctor_id, id, ARRAY['S39.012A'], ARRAY['992X3'], NULL, 500,
  'needs_review',
  '["Claim is missing a diagnosis summary.", "Malformed CPT code(s): 992X3"]',
  45, '["No properly formatted CPT procedure code attached"]',
  'This claim needs review: it is missing a diagnosis summary and the CPT code "992X3" does not match the standard 5-digit format. Correct these two issues before resubmitting.'
FROM new_coding
ON CONFLICT (claim_number) DO NOTHING;

-- 3d. SUBMITTED — validated and submitted by admin, awaiting payer response
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     admin AS (SELECT id AS admin_id FROM profiles WHERE email = 'verify.admin@medops.test'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CLM-SUBMIT', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 7, '14:00', 'in_person', 'completed', 'normal', 'Annual wellness check-up', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan)
       SELECT id, doctor_id, patient_id, 'Routine annual physical, no acute complaints', 'Vitals within normal limits', 'General health examination, no abnormal findings', 'Continue current lifestyle, routine follow-up in 1 year'
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: General health examination, no abnormal findings.',
         'llama-3.3-70b-versatile',
         '[{"code":"Z00.00","code_type":"ICD-10","description":"General adult medical examination without abnormal findings","confidence":0.92,"rationale":"Diagnosis: General health examination, no abnormal findings."},{"code":"99395","code_type":"CPT","description":"Periodic preventive exam, established patient","confidence":0.87,"rationale":"Routine annual physical."}]'::jsonb,
         '[{"code":"Z00.00","code_type":"ICD-10","description":"General adult medical examination without abnormal findings","confidence":0.92,"rationale":"Diagnosis: General health examination, no abnormal findings."},{"code":"99395","code_type":"CPT","description":"Periodic preventive exam, established patient","confidence":0.87,"rationale":"Routine annual physical."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale, submitted_at, submitted_by)
SELECT 'CLM-DEMO-SUBMIT', nc.appointment_id, nc.patient_id, nc.doctor_id, nc.id, ARRAY['Z00.00'], ARRAY['99395'], 'General health examination, no abnormal findings.', 500,
  'submitted', '[]', 5, '[]', 'This claim passed automated validation with no errors and a low denial-risk score of 5/100.',
  now() - interval '2 days', admin.admin_id
FROM new_coding nc, admin
ON CONFLICT (claim_number) DO NOTHING;

-- 3e. APPROVED — submitted, then payer approved
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     admin AS (SELECT id AS admin_id FROM profiles WHERE email = 'verify.admin@medops.test'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CLM-APPROVE', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 10, '15:30', 'in_person', 'completed', 'normal', 'Sore throat and mild fever', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan)
       SELECT id, doctor_id, patient_id, 'Sore throat, mild fever for 2 days', 'Pharyngeal erythema, temp 100.8F', 'Acute pharyngitis', 'Supportive care, amoxicillin if worsens'
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Acute pharyngitis.',
         'llama-3.3-70b-versatile',
         '[{"code":"J02.9","code_type":"ICD-10","description":"Acute pharyngitis, unspecified","confidence":0.89,"rationale":"Diagnosis: Acute pharyngitis."},{"code":"99213","code_type":"CPT","description":"Established patient office visit","confidence":0.84,"rationale":"Office visit."}]'::jsonb,
         '[{"code":"J02.9","code_type":"ICD-10","description":"Acute pharyngitis, unspecified","confidence":0.89,"rationale":"Diagnosis: Acute pharyngitis."},{"code":"99213","code_type":"CPT","description":"Established patient office visit","confidence":0.84,"rationale":"Office visit."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale, submitted_at, submitted_by, decided_at)
SELECT 'CLM-DEMO-APPROVE', nc.appointment_id, nc.patient_id, nc.doctor_id, nc.id, ARRAY['J02.9'], ARRAY['99213'], 'Acute pharyngitis.', 500,
  'approved', '[]', 6, '[]', 'This claim passed automated validation with no errors and a low denial-risk score of 6/100.',
  now() - interval '9 days', admin.admin_id, now() - interval '6 days'
FROM new_coding nc, admin
ON CONFLICT (claim_number) DO NOTHING;

-- 3f. DENIED — submitted, then payer denied (simulated response)
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     admin AS (SELECT id AS admin_id FROM profiles WHERE email = 'verify.admin@medops.test'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CLM-DENY', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 14, '16:00', 'in_person', 'completed', 'normal', 'Skin rash on forearm', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan)
       SELECT id, doctor_id, patient_id, 'Itchy red rash on left forearm for 4 days', 'Erythematous rash, no signs of infection', 'Contact dermatitis', 'Topical corticosteroid, avoid irritant'
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Contact dermatitis.',
         'llama-3.3-70b-versatile',
         '[{"code":"L25.9","code_type":"ICD-10","description":"Unspecified contact dermatitis, unspecified cause","confidence":0.8,"rationale":"Diagnosis: Contact dermatitis."}]'::jsonb,
         '[{"code":"L25.9","code_type":"ICD-10","description":"Unspecified contact dermatitis, unspecified cause","confidence":0.8,"rationale":"Diagnosis: Contact dermatitis."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale, submitted_at, submitted_by, decided_at, denial_reason)
SELECT 'CLM-DEMO-DENY', nc.appointment_id, nc.patient_id, nc.doctor_id, nc.id, ARRAY['L25.9'], ARRAY[]::text[], 'Contact dermatitis.', 500,
  'denied', '[]', 35, '["No CPT procedure code attached — payers commonly deny diagnosis-only claims"]',
  'This claim has no CPT procedure code attached, which is a common reason payers deny diagnosis-only claims. Denial risk was flagged at 35/100 prior to submission.',
  now() - interval '13 days', admin.admin_id, now() - interval '10 days', 'Missing procedure code (CPT) — diagnosis-only claims are not reimbursable under this plan.'
FROM new_coding nc, admin
ON CONFLICT (claim_number) DO NOTHING;

-- ============ 4. Pre-analyzed medical report fixtures ============
WITH pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01')
INSERT INTO medical_reports (patient_id, report_type, title, description, ai_summary, ai_diseases, ai_medicines, ai_test_results, is_processed)
SELECT pat.patient_id, r.report_type, r.title, r.description, r.ai_summary, r.ai_diseases, r.ai_medicines, r.ai_test_results::jsonb, true
FROM pat
CROSS JOIN (VALUES
  ('lab', 'Complete Blood Count', 'Routine CBC panel',
   'The complete blood count shows hemoglobin and white cell counts within normal limits. Platelet count is adequate. No significant abnormalities detected.',
   ARRAY[]::text[], ARRAY[]::text[],
   '{"Hemoglobin":"13.6 g/dL","WBC":"7.1 K/uL","Platelets":"245 K/uL"}'),
  ('prescription', 'Diabetes Management Prescription', 'Prescription from endocrinology follow-up',
   'Prescription for ongoing type 2 diabetes management, continuing metformin with an added ACE inhibitor for blood pressure control.',
   ARRAY['Type 2 diabetes mellitus', 'Essential hypertension'], ARRAY['Metformin 500mg', 'Lisinopril 10mg'],
   '{}')
) AS r(report_type, title, description, ai_summary, ai_diseases, ai_medicines, ai_test_results)
WHERE NOT EXISTS (SELECT 1 FROM medical_reports WHERE title = r.title AND patient_id = pat.patient_id);

-- ============ 5. Notifications ============
-- notifications has no unique constraint, so guard idempotency with NOT EXISTS
-- instead of ON CONFLICT (which needs a matching constraint to target).
INSERT INTO notifications (user_id, title, message, type)
SELECT p.id, n.title, n.message, n.type
FROM profiles p
CROSS JOIN (VALUES
  ('New Claim Ready for Review', 'A claim is ready for validation in Claims Management.', 'system'),
  ('Weekly Roster Published', 'Staff shifts for the next two weeks have been generated.', 'system')
) AS n(title, message, type)
WHERE p.email = 'verify.admin@medops.test'
  AND NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = p.id AND title = n.title);

-- ============ 6. Past video consultations ============
-- The "Video Consultations" stat on Analytics/Dashboard counts appointments
-- with type='video', not the video_sessions table directly — so this seeds
-- both: completed video appointments (drives the stat) and matching
-- video_sessions rows (for consistency if anything inspects them directly).
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-VIDEO-1', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 6, '17:30', 'video', 'completed', 'normal', 'Follow-up video consultation — medication review', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     )
INSERT INTO video_sessions (appointment_id, room_id, patient_id, doctor_id, status, scheduled_at, started_at, ended_at, duration_seconds, chat_messages, ai_summary)
SELECT id, 'room-demo-video-1', patient_id, doctor_id, 'completed',
  (CURRENT_DATE - 6 + time '17:30')::timestamptz,
  (CURRENT_DATE - 6 + time '17:31')::timestamptz,
  (CURRENT_DATE - 6 + time '17:47')::timestamptz,
  960,
  '[{"sender":"doctor","message":"Hi, how have you been feeling since starting the new medication?","timestamp":"2026-01-01T00:01:00Z"},{"sender":"patient","message":"Better overall, blood pressure readings have been steadier.","timestamp":"2026-01-01T00:02:00Z"}]'::jsonb,
  'Follow-up video consultation for medication review. Patient reports improved blood pressure control since starting lisinopril. No new complaints. Continue current regimen.'
FROM new_appt
ON CONFLICT (room_id) DO NOTHING;

WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-VIDEO-2', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 18, '18:00', 'video', 'completed', 'normal', 'Initial video consultation — new symptoms', 500, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     )
INSERT INTO video_sessions (appointment_id, room_id, patient_id, doctor_id, status, scheduled_at, started_at, ended_at, duration_seconds, chat_messages, ai_summary)
SELECT id, 'room-demo-video-2', patient_id, doctor_id, 'completed',
  (CURRENT_DATE - 18 + time '18:00')::timestamptz,
  (CURRENT_DATE - 18 + time '18:02')::timestamptz,
  (CURRENT_DATE - 18 + time '18:19')::timestamptz,
  1020,
  '[{"sender":"patient","message":"I have been getting mild headaches in the afternoons for about a week.","timestamp":"2026-01-01T00:01:00Z"},{"sender":"doctor","message":"Any vision changes or nausea with them?","timestamp":"2026-01-01T00:02:00Z"},{"sender":"patient","message":"No, just the headache and some tiredness.","timestamp":"2026-01-01T00:03:00Z"}]'::jsonb,
  'Initial video consultation for recurring afternoon headaches, one week duration, no red-flag symptoms reported. Recommended hydration, screen-break schedule, and follow-up if not improved in two weeks.'
FROM new_appt
ON CONFLICT (room_id) DO NOTHING;

-- Sanity check
SELECT 'departments' AS kind, COUNT(*) FROM departments
UNION ALL SELECT 'health_problems', COUNT(*) FROM health_problems
UNION ALL SELECT 'staff_shifts', COUNT(*) FROM staff_shifts
UNION ALL SELECT 'claims', COUNT(*) FROM claims
UNION ALL SELECT status, COUNT(*) FROM claims GROUP BY status
UNION ALL SELECT 'medical_reports', COUNT(*) FROM medical_reports
UNION ALL SELECT 'video_sessions', COUNT(*) FROM video_sessions;
