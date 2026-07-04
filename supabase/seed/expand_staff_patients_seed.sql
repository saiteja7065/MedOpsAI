-- Expands the demo to use the 14 accounts created via Dashboard > Add User
-- (9 doctors, 5 patients, all password Patient@Demo2026!) plus the original
-- verify.doctor / verify.patient. Run this AFTER full_demo_seed.sql.
-- Safe to re-run (unique constraints + ON CONFLICT guards throughout).
--
-- What this adds:
--   1. Correct role + a real full name/phone for all 14 profiles (Dashboard-
--      created users have no metadata, so they defaulted to role='patient'
--      with a blank name)
--   2. 9 doctor records — 2 per department (Cardiology, Neurology,
--      Orthopedics, Pediatrics) plus a 2nd Internal Medicine doctor
--   3. 5 patient records with varied insurance/conditions
--   4. Two weeks of staff shifts for all 9 new doctors
--   5. Appointments spread across every new doctor and all 6 patients
--   6. Two more claims (Cardiology, Orthopedics) so Claims isn't all
--      Internal Medicine
--   7. One past completed video consultation per new doctor (9 total),
--      patients assigned round-robin across all 6

-- ============ 1. Roles + names + phone ============
UPDATE profiles p
SET full_name = v.full_name, role = v.role, phone = v.phone
FROM (VALUES
  ('doctor.imed2@medops.test',  'Dr. Ananya Reddy',    'doctor',  '+91-9820011002'),
  ('doctor.cardio1@medops.test','Dr. Vikram Rao',      'doctor',  '+91-9820011003'),
  ('doctor.cardio2@medops.test','Dr. Priya Nair',      'doctor',  '+91-9820011004'),
  ('doctor.neuro1@medops.test', 'Dr. Arjun Mehta',     'doctor',  '+91-9820011005'),
  ('doctor.neuro2@medops.test', 'Dr. Kavya Iyer',      'doctor',  '+91-9820011006'),
  ('doctor.ortho1@medops.test', 'Dr. Rohan Malhotra',  'doctor',  '+91-9820011007'),
  ('doctor.ortho2@medops.test', 'Dr. Sneha Kapoor',    'doctor',  '+91-9820011008'),
  ('doctor.peds1@medops.test',  'Dr. Aditya Kulkarni', 'doctor',  '+91-9820011009'),
  ('doctor.peds2@medops.test',  'Dr. Meera Pillai',    'doctor',  '+91-9820011010'),
  ('patient2@medops.test', 'Ishaan Sharma', 'patient', '+91-9820022002'),
  ('patient3@medops.test', 'Divya Patel',   'patient', '+91-9820022003'),
  ('patient4@medops.test', 'Karan Singh',   'patient', '+91-9820022004'),
  ('patient5@medops.test', 'Neha Gupta',    'patient', '+91-9820022005'),
  ('patient6@medops.test', 'Rahul Joshi',   'patient', '+91-9820022006')
) AS v(email, full_name, role, phone)
WHERE p.email = v.email;

-- ============ 2. Doctor records, 2 per department ============
INSERT INTO doctors (profile_id, department_id, employee_id, specialization, qualification, experience_years, consultation_fee, languages, available_days, rating, total_consultations, is_available)
SELECT p.id, d.id, v.employee_id, v.specialization, v.qualification, v.experience_years, v.consultation_fee,
       ARRAY['English', 'Hindi'], ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'], v.rating, v.total_consultations, true
FROM (VALUES
  ('doctor.imed2@medops.test',   'Internal Medicine', 'EMP-DEMO-02', 'General Internal Medicine',       'MBBS, MD',                  8,  500, 4.6, 340),
  ('doctor.cardio1@medops.test', 'Cardiology',         'EMP-DEMO-03', 'Interventional Cardiology',       'MBBS, MD, DM Cardiology',   15, 900, 4.8, 1120),
  ('doctor.cardio2@medops.test', 'Cardiology',         'EMP-DEMO-04', 'Cardiac Electrophysiology',       'MBBS, MD, DM Cardiology',   10, 850, 4.7, 610),
  ('doctor.neuro1@medops.test',  'Neurology',          'EMP-DEMO-05', 'General Neurology',               'MBBS, MD, DM Neurology',    12, 800, 4.6, 720),
  ('doctor.neuro2@medops.test',  'Neurology',          'EMP-DEMO-06', 'Stroke & Vascular Neurology',     'MBBS, MD, DM Neurology',    9,  800, 4.5, 430),
  ('doctor.ortho1@medops.test',  'Orthopedics',        'EMP-DEMO-07', 'Orthopedic Surgery',              'MBBS, MS Orthopedics',      14, 750, 4.7, 980),
  ('doctor.ortho2@medops.test',  'Orthopedics',        'EMP-DEMO-08', 'Sports Medicine & Orthopedics',   'MBBS, MS Orthopedics',      7,  700, 4.4, 350),
  ('doctor.peds1@medops.test',   'Pediatrics',         'EMP-DEMO-09', 'General Pediatrics',              'MBBS, MD Pediatrics',       11, 600, 4.8, 890),
  ('doctor.peds2@medops.test',   'Pediatrics',         'EMP-DEMO-10', 'Pediatric Pulmonology',           'MBBS, MD Pediatrics',       6,  650, 4.5, 260)
) AS v(email, dept_name, employee_id, specialization, qualification, experience_years, consultation_fee, rating, total_consultations)
JOIN profiles p ON p.email = v.email
JOIN departments d ON d.name = v.dept_name
ON CONFLICT (employee_id) DO NOTHING;

-- ============ 3. Patient records ============
INSERT INTO patients (profile_id, patient_id, blood_group, chronic_conditions, allergies, insurance_provider, insurance_number, insurance_expiry)
SELECT p.id, v.patient_id, v.blood_group, v.chronic_conditions, v.allergies, v.insurance_provider, v.insurance_number, '2027-12-31'
FROM (VALUES
  ('patient2@medops.test', 'PAT-DEMO-02', 'A+',  ARRAY['Asthma'],           ARRAY[]::text[],        'Star Health Insurance', 'SHI-200201'),
  ('patient3@medops.test', 'PAT-DEMO-03', 'B+',  ARRAY[]::text[],          ARRAY['Penicillin'],     'HDFC Ergo Health',      'HEH-200302'),
  ('patient4@medops.test', 'PAT-DEMO-04', 'O-',  ARRAY['Hypertension'],     ARRAY[]::text[],        'ICICI Lombard',         'ICL-200403'),
  ('patient5@medops.test', 'PAT-DEMO-05', 'AB+', ARRAY['Type 2 Diabetes'],  ARRAY[]::text[],        'Star Health Insurance', 'SHI-200504'),
  ('patient6@medops.test', 'PAT-DEMO-06', 'O+',  ARRAY[]::text[],          ARRAY['Dust'],           'New India Assurance',   'NIA-200605')
) AS v(email, patient_id, blood_group, chronic_conditions, allergies, insurance_provider, insurance_number)
JOIN profiles p ON p.email = v.email
ON CONFLICT (patient_id) DO NOTHING;

-- ============ 4. Staff shifts for the 9 new doctors (2 weeks, Mon-Fri, AM+PM) ============
INSERT INTO staff_shifts (doctor_id, department_id, shift_date, shift_type)
SELECT d.id, d.department_id, day::date, s.shift_type
FROM doctors d
CROSS JOIN generate_series(
  date_trunc('week', CURRENT_DATE)::date,
  date_trunc('week', CURRENT_DATE)::date + 11,
  interval '1 day'
) AS day
CROSS JOIN (VALUES ('morning'), ('evening')) AS s(shift_type)
WHERE d.employee_id LIKE 'EMP-DEMO-%' AND d.employee_id <> 'EMP-DEMO-01'
  AND extract(isodow FROM day) BETWEEN 1 AND 5
ON CONFLICT (doctor_id, shift_date, shift_type) DO NOTHING;

-- ============ 5. Appointments spread across every new doctor + all 6 patients ============
-- 1 upcoming (confirmed) + 3 past (completed) per new doctor, patients assigned round-robin.
WITH new_doctors AS (
  SELECT d.id AS doctor_id, d.department_id, d.specialization, d.consultation_fee,
         row_number() OVER (ORDER BY d.employee_id) AS rn
  FROM doctors d
  WHERE d.employee_id LIKE 'EMP-DEMO-%' AND d.employee_id <> 'EMP-DEMO-01'
),
all_patients AS (
  SELECT id AS patient_id, row_number() OVER (ORDER BY patient_id) AS rn, COUNT(*) OVER () AS total
  FROM patients
),
offsets AS (SELECT generate_series(0, 3) AS i)
INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
SELECT
  'APT-EXP-' || nd.rn || '-' || o.i,
  ap.patient_id,
  nd.doctor_id,
  nd.department_id,
  CURRENT_DATE + 3 - (o.i * 7),
  ('09:00'::time + (o.i || ' hours')::interval)::time,
  'in_person',
  CASE WHEN o.i = 0 THEN 'confirmed' ELSE 'completed' END,
  'normal',
  'Consultation — ' || nd.specialization,
  nd.consultation_fee,
  o.i <> 0
FROM new_doctors nd
CROSS JOIN offsets o
JOIN all_patients ap ON ap.rn = ((nd.rn + o.i - 1) % ap.total) + 1
ON CONFLICT (appointment_number) DO NOTHING;

-- ============ 6. Two more claims outside Internal Medicine ============

-- Cardiology — VALIDATED
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-03'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-02'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-CARDIO-CLM', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 4, '11:30', 'in_person', 'completed', 'normal', 'Palpitations and occasional chest tightness', 900, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan, vitals)
       SELECT id, doctor_id, patient_id, 'Palpitations and occasional chest tightness for 1 week', 'Irregular pulse noted, ECG shows occasional PVCs', 'Cardiac arrhythmia, benign premature ventricular contractions', 'Beta-blocker started, Holter monitor ordered', '{"heart_rate":92}'::jsonb
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Cardiac arrhythmia, benign premature ventricular contractions.',
         'llama-3.3-70b-versatile',
         '[{"code":"I49.3","code_type":"ICD-10","description":"Ventricular premature depolarization","confidence":0.83,"rationale":"Diagnosis: benign premature ventricular contractions."},{"code":"99214","code_type":"CPT","description":"Established patient visit, moderate complexity","confidence":0.86,"rationale":"ECG review and management plan."}]'::jsonb,
         '[{"code":"I49.3","code_type":"ICD-10","description":"Ventricular premature depolarization","confidence":0.83,"rationale":"Diagnosis: benign premature ventricular contractions."},{"code":"99214","code_type":"CPT","description":"Established patient visit, moderate complexity","confidence":0.86,"rationale":"ECG review and management plan."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale)
SELECT 'CLM-DEMO-CARDIO', appointment_id, patient_id, doctor_id, id, ARRAY['I49.3'], ARRAY['99214'], 'Benign premature ventricular contractions, on beta-blocker.', 900, 'validated', '[]', 10, '[]', 'This claim passed automated validation with no errors and a low denial-risk score of 10/100.'
FROM new_coding
ON CONFLICT (claim_number) DO NOTHING;

-- Orthopedics — SUBMITTED
WITH doc AS (SELECT id AS doctor_id, department_id FROM doctors WHERE employee_id = 'EMP-DEMO-07'),
     pat AS (SELECT id AS patient_id FROM patients WHERE patient_id = 'PAT-DEMO-04'),
     admin AS (SELECT id AS admin_id FROM profiles WHERE email = 'verify.admin@medops.test'),
     new_appt AS (
       INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
       SELECT 'APT-DEMO-ORTHO-CLM', pat.patient_id, doc.doctor_id, doc.department_id, CURRENT_DATE - 8, '13:00', 'in_person', 'completed', 'normal', 'Knee pain after a fall', 750, true
       FROM doc, pat
       ON CONFLICT (appointment_number) DO NOTHING
       RETURNING id, patient_id, doctor_id
     ),
     new_note AS (
       INSERT INTO clinical_notes (appointment_id, doctor_id, patient_id, chief_complaint, examination_findings, diagnosis, treatment_plan)
       SELECT id, doctor_id, patient_id, 'Right knee pain and swelling after a fall 2 days ago', 'Mild effusion, tender over medial joint line, stable ligaments', 'Right knee sprain, medial collateral ligament strain', 'Knee brace, RICE protocol, NSAIDs, physiotherapy referral'
       FROM new_appt
       RETURNING id, appointment_id, doctor_id, patient_id
     ),
     new_coding AS (
       INSERT INTO coding_suggestions (clinical_note_id, appointment_id, patient_id, doctor_id, input_text, model, suggested_codes, confirmed_codes, status, confirmed_at)
       SELECT id, appointment_id, patient_id, doctor_id,
         'Diagnosis: Right knee sprain, medial collateral ligament strain.',
         'llama-3.3-70b-versatile',
         '[{"code":"S83.411A","code_type":"ICD-10","description":"Sprain of medial collateral ligament of right knee, initial encounter","confidence":0.81,"rationale":"Diagnosis: medial collateral ligament strain."},{"code":"99204","code_type":"CPT","description":"New patient office visit, moderate complexity","confidence":0.8,"rationale":"Initial injury evaluation."}]'::jsonb,
         '[{"code":"S83.411A","code_type":"ICD-10","description":"Sprain of medial collateral ligament of right knee, initial encounter","confidence":0.81,"rationale":"Diagnosis: medial collateral ligament strain."},{"code":"99204","code_type":"CPT","description":"New patient office visit, moderate complexity","confidence":0.8,"rationale":"Initial injury evaluation."}]'::jsonb,
         'confirmed', now()
       FROM new_note
       RETURNING id, appointment_id, patient_id, doctor_id
     )
INSERT INTO claims (claim_number, appointment_id, patient_id, doctor_id, coding_suggestion_id, icd_codes, cpt_codes, diagnosis_summary, billed_amount, status, validation_errors, denial_risk_score, denial_risk_reasons, denial_risk_rationale, submitted_at, submitted_by)
SELECT 'CLM-DEMO-ORTHO', nc.appointment_id, nc.patient_id, nc.doctor_id, nc.id, ARRAY['S83.411A'], ARRAY['99204'], 'Right knee MCL sprain following a fall.', 750, 'submitted', '[]', 12, '[]', 'This claim passed automated validation with no errors and a low denial-risk score of 12/100.', now() - interval '1 day', admin.admin_id
FROM new_coding nc, admin
ON CONFLICT (claim_number) DO NOTHING;

-- ============ 7. One past video consultation per new doctor ============
WITH new_doctors AS (
  SELECT d.id AS doctor_id, d.department_id, d.specialization, d.consultation_fee,
         (row_number() OVER (ORDER BY d.employee_id))::int AS rn
  FROM doctors d
  WHERE d.employee_id LIKE 'EMP-DEMO-%' AND d.employee_id <> 'EMP-DEMO-01'
),
all_patients AS (
  SELECT id AS patient_id, (row_number() OVER (ORDER BY patient_id))::int AS rn, COUNT(*) OVER () AS total
  FROM patients
),
new_video_appts AS (
  INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, appointment_time, type, status, priority, reason, fee, is_paid)
  SELECT
    'APT-EXP-VIDEO-' || nd.rn,
    ap.patient_id, nd.doctor_id, nd.department_id,
    CURRENT_DATE - (5 + nd.rn), '17:00'::time, 'video', 'completed', 'normal',
    'Video follow-up — ' || nd.specialization, nd.consultation_fee, true
  FROM new_doctors nd
  JOIN all_patients ap ON ap.rn = ((nd.rn - 1) % ap.total) + 1
  ON CONFLICT (appointment_number) DO NOTHING
  RETURNING id, patient_id, doctor_id, appointment_number, appointment_date, appointment_time
)
INSERT INTO video_sessions (appointment_id, room_id, patient_id, doctor_id, status, scheduled_at, started_at, ended_at, duration_seconds, chat_messages, ai_summary)
SELECT
  id,
  'room-' || lower(appointment_number),
  patient_id, doctor_id, 'completed',
  (appointment_date + appointment_time)::timestamptz,
  (appointment_date + appointment_time)::timestamptz + interval '2 minutes',
  (appointment_date + appointment_time)::timestamptz + interval '18 minutes',
  960,
  '[{"sender":"doctor","message":"Hello, how are things since our last visit?","timestamp":"2026-01-01T00:01:00Z"},{"sender":"patient","message":"Doing better, thanks for checking in.","timestamp":"2026-01-01T00:02:00Z"}]'::jsonb,
  'Video follow-up consultation. Patient reports improvement since last visit. No new concerns raised. Continue current treatment plan.'
FROM new_video_appts
ON CONFLICT (room_id) DO NOTHING;

-- Sanity check
SELECT 'doctors' AS kind, COUNT(*) FROM doctors
UNION ALL SELECT 'patients', COUNT(*) FROM patients
UNION ALL SELECT 'staff_shifts', COUNT(*) FROM staff_shifts
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'claims', COUNT(*) FROM claims
UNION ALL SELECT status, COUNT(*) FROM claims GROUP BY status
UNION ALL SELECT 'video_sessions', COUNT(*) FROM video_sessions;
