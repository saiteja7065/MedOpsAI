-- Demo seed for manually testing the Medical Coding & Claims module.
--
-- Uses the 3 test accounts already created via Dashboard > Authentication >
-- Users (the ones used for automated verification). Their roles are already
-- set correctly. No need to register new accounts through the app — the
-- signup mailer's rate limit on this project is exhausted regardless of the
-- confirm-email setting, so use these existing logins instead:
--
--   Admin:   verify.admin@medops.test   / Verify@Admin2026!
--   Doctor:  verify.doctor@medops.test  / Verify@Doctor2026!
--   Patient: verify.patient@medops.test / Verify@Patient2026!
--
-- Paste this whole file into Supabase Dashboard > SQL Editor > Run.
-- It does three things:
--   1. Creates one department ("Internal Medicine")
--   2. Turns the doctor account into a full doctor record in that department
--   3. Turns the patient account into a full patient record with insurance on file

-- 1. Department
INSERT INTO departments (name, description, floor_number)
VALUES ('Internal Medicine', 'General adult care', 1)
ON CONFLICT (name) DO NOTHING;

-- 2. Doctor record
INSERT INTO doctors (profile_id, department_id, employee_id, specialization, qualification, consultation_fee)
SELECT p.id, d.id, 'EMP-DEMO-01', 'Internal Medicine', 'MD', 500
FROM profiles p, departments d
WHERE p.email = 'verify.doctor@medops.test'
  AND d.name = 'Internal Medicine'
  AND NOT EXISTS (SELECT 1 FROM doctors WHERE profile_id = p.id);

-- 3. Patient record
INSERT INTO patients (profile_id, patient_id, blood_group, insurance_provider, insurance_number, insurance_expiry)
SELECT p.id, 'PAT-DEMO-01', 'O+', 'Sample Health Plan', 'SHP-000123', '2027-12-31'
FROM profiles p
WHERE p.email = 'verify.patient@medops.test'
  AND NOT EXISTS (SELECT 1 FROM patients WHERE profile_id = p.id);

-- 4. Health problems for Internal Medicine (Book Appointment's step 1 searches
--    this table; it was seeded only for Cardiology/Neurology/etc. in migration
--    2, none of which exist, so without this the symptom search always comes
--    back empty)
INSERT INTO health_problems (name, description, department_id, icon, category)
SELECT hp.name, hp.description, d.id, hp.icon, 'general'
FROM (VALUES
  ('Diabetes Follow-up', 'Blood sugar management and diabetes check-up', 'droplet'),
  ('High Blood Pressure', 'Elevated blood pressure readings', 'heart-pulse'),
  ('General Check-up', 'Routine health check-up', 'stethoscope'),
  ('Fatigue', 'Persistent tiredness or low energy', 'battery-low')
) AS hp(name, description, icon)
CROSS JOIN departments d
WHERE d.name = 'Internal Medicine'
ON CONFLICT (name) DO NOTHING;

-- Sanity check — should show your one department, one doctor, one patient
SELECT 'department' AS kind, name AS label FROM departments WHERE name = 'Internal Medicine'
UNION ALL
SELECT 'doctor', employee_id FROM doctors WHERE employee_id = 'EMP-DEMO-01'
UNION ALL
SELECT 'patient', patient_id FROM patients WHERE patient_id = 'PAT-DEMO-01'
UNION ALL
SELECT 'health_problem', name FROM health_problems WHERE name IN ('Diabetes Follow-up', 'High Blood Pressure', 'General Check-up', 'Fatigue');
