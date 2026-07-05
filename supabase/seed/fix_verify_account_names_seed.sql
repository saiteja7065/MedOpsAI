-- demo_seed.sql (the very first seed run in this project) turned the 3
-- Dashboard-created verify.* accounts into doctor/patient records, but never
-- set their profiles.full_name — it's been blank this whole time, which is
-- why the doctor's own patient card, the Patient Details modal, and the
-- Doctor/Admin Copilots all show no name (or "Unknown") for PAT-DEMO-01 and
-- EMP-DEMO-01. Safe to re-run.
UPDATE profiles p
SET full_name = v.full_name, phone = v.phone
FROM (VALUES
  ('verify.admin@medops.test',   'Sanjay Mehta',    '+91-9820000001'),
  ('verify.doctor@medops.test',  'Dr. Rajesh Kumar', '+91-9820000002'),
  ('verify.patient@medops.test', 'Amit Verma',       '+91-9820000003')
) AS v(email, full_name, phone)
WHERE p.email = v.email AND (p.full_name IS NULL OR p.full_name = '');

-- Sanity check
SELECT email, full_name, role, phone FROM profiles
WHERE email IN ('verify.admin@medops.test', 'verify.doctor@medops.test', 'verify.patient@medops.test');
