-- Fills in the one gap left in the Doctor/Patient demo data: the
-- `prescriptions` table has been empty this whole time, so Patient >
-- Prescriptions and the "Active Prescriptions" widgets on both the
-- Patient and Doctor dashboards render empty states even though every
-- other table (appointments, claims, video_sessions, staff_shifts...)
-- is fully seeded.
--
-- Attaches a department-appropriate prescription to every completed
-- appointment that doesn't already have one. Safe to re-run: the
-- NOT EXISTS guard means a second run inserts nothing new.

-- Cleanup: the first version of this script (already run) didn't exclude
-- the ~345 synthetic APT-HIST-% rows used for demand forecasting, so it
-- generated a prescription for every one of them against a single patient.
-- Remove those before re-inserting correctly.
DELETE FROM prescriptions p
USING appointments a
WHERE p.appointment_id = a.id
  AND a.appointment_number LIKE 'APT-HIST-%';

WITH completed AS (
  SELECT a.id AS appointment_id, a.patient_id, a.doctor_id,
         d.name AS department_name,
         (row_number() OVER (PARTITION BY d.name ORDER BY a.appointment_date))::int AS rn
  FROM appointments a
  JOIN departments d ON d.id = a.department_id
  WHERE a.status = 'completed'
    AND a.appointment_number NOT LIKE 'APT-HIST-%'
    AND NOT EXISTS (SELECT 1 FROM prescriptions p WHERE p.appointment_id = a.id)
),
options AS (
  SELECT * FROM (VALUES
    ('Internal Medicine', 1, 'Seasonal allergic rhinitis',
      '[{"name":"Cetirizine","dosage":"10mg","frequency":"Once daily","duration":"7 days"},{"name":"Fluticasone nasal spray","dosage":"1 spray/nostril","frequency":"Twice daily","duration":"14 days"}]'::jsonb,
      'Avoid known allergens; drink plenty of fluids.', 14),
    ('Internal Medicine', 0, 'Type 2 diabetes mellitus with hypertension',
      '[{"name":"Metformin","dosage":"500mg","frequency":"Twice daily","duration":"30 days"},{"name":"Amlodipine","dosage":"5mg","frequency":"Once daily","duration":"30 days"}]'::jsonb,
      'Monitor fasting blood sugar weekly; low-sodium diet.', 30),
    ('Cardiology', 1, 'Stable angina, mild coronary artery disease',
      '[{"name":"Atorvastatin","dosage":"20mg","frequency":"Once nightly","duration":"30 days"},{"name":"Aspirin","dosage":"75mg","frequency":"Once daily","duration":"30 days"}]'::jsonb,
      'Avoid strenuous exertion; follow up with ECG in 4 weeks.', 28),
    ('Cardiology', 0, 'Palpitations, benign premature ventricular contractions',
      '[{"name":"Metoprolol","dosage":"25mg","frequency":"Twice daily","duration":"14 days"}]'::jsonb,
      'Reduce caffeine intake; report dizziness immediately.', 14),
    ('Neurology', 1, 'Migraine with aura',
      '[{"name":"Sumatriptan","dosage":"50mg","frequency":"As needed, max 2/day","duration":"10 tablets"},{"name":"Propranolol","dosage":"40mg","frequency":"Once daily","duration":"30 days"}]'::jsonb,
      'Maintain a headache diary; avoid known triggers.', 30),
    ('Neurology', 0, 'Tension-type headache',
      '[{"name":"Ibuprofen","dosage":"400mg","frequency":"As needed","duration":"7 days"}]'::jsonb,
      'Ensure adequate sleep and hydration.', 14),
    ('Orthopedics', 1, 'Lumbar muscle strain',
      '[{"name":"Naproxen","dosage":"500mg","frequency":"Twice daily","duration":"7 days"},{"name":"Cyclobenzaprine","dosage":"5mg","frequency":"At night","duration":"7 days"}]'::jsonb,
      'Physiotherapy recommended; avoid heavy lifting for 2 weeks.', 14),
    ('Orthopedics', 0, 'Medial collateral ligament sprain',
      '[{"name":"Diclofenac gel","dosage":"Apply thin layer","frequency":"3 times daily","duration":"10 days"}]'::jsonb,
      'Use knee brace; RICE protocol; physiotherapy in 1 week.', 21),
    ('Pediatrics', 1, 'Acute viral pharyngitis',
      '[{"name":"Paracetamol syrup","dosage":"5ml","frequency":"Every 6 hours if fever","duration":"5 days"},{"name":"Warm saline gargle","dosage":"-","frequency":"3 times daily","duration":"5 days"}]'::jsonb,
      'Encourage fluids and rest; return if fever exceeds 3 days.', 7),
    ('Pediatrics', 0, 'Mild persistent asthma',
      '[{"name":"Salbutamol inhaler","dosage":"2 puffs","frequency":"As needed","duration":"30 days"},{"name":"Budesonide inhaler","dosage":"1 puff","frequency":"Twice daily","duration":"30 days"}]'::jsonb,
      'Use spacer device; avoid dust and cold air triggers.', 30)
  ) AS o(department_name, parity, diagnosis, medicines, instructions, follow_up_days)
)
INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, diagnosis, medicines, instructions, follow_up_date)
SELECT c.appointment_id, c.patient_id, c.doctor_id, o.diagnosis, o.medicines, o.instructions, CURRENT_DATE + o.follow_up_days
FROM completed c
JOIN options o ON o.department_name = c.department_name AND o.parity = (c.rn % 2);

-- ============ Section 2: one medical report per new patient ============
-- The only medical_reports rows so far belong to PAT-DEMO-01 (the original
-- verify.patient), so Doctor > Reports is empty for all 9 new doctors and
-- Patient > Medical Reports is empty for the other 5 patients. Add one
-- report each, matched to the chronic condition already on their profile.
INSERT INTO medical_reports (patient_id, report_type, title, description, ai_summary, ai_diseases, ai_medicines, ai_test_results, is_processed)
SELECT pat.id, v.report_type, v.title, v.description, v.ai_summary, v.ai_diseases, v.ai_medicines, v.ai_test_results::jsonb, true
FROM (VALUES
  ('PAT-DEMO-02', 'lab', 'Pulmonary Function Test', 'Spirometry for asthma follow-up',
    'Spirometry shows mild airway obstruction consistent with well-controlled asthma. FEV1/FVC ratio slightly reduced. Continue current inhaler regimen.',
    ARRAY['Asthma'], ARRAY['Salbutamol inhaler'], '{"FEV1":"82% predicted","FVC":"94% predicted","FEV1/FVC":"0.74"}'),
  ('PAT-DEMO-03', 'lab', 'Allergy Panel', 'Serum IgE panel following penicillin reaction',
    'Elevated IgE confirms penicillin sensitivity. No cross-reactivity markers found for other beta-lactams tested. Recommend documenting allergy in all future prescriptions.',
    ARRAY[]::text[], ARRAY[]::text[], '{"Total IgE":"310 IU/mL","Penicillin-specific IgE":"Positive"}'),
  ('PAT-DEMO-04', 'lab', 'Ambulatory Blood Pressure Monitoring', '24-hour BP monitoring for hypertension management',
    '24-hour average blood pressure is 138/88, indicating suboptimal control on current regimen. Consider dose adjustment or add-on therapy at next visit.',
    ARRAY['Hypertension'], ARRAY['Amlodipine 5mg'], '{"Average BP":"138/88 mmHg","Night dip":"6%"}'),
  ('PAT-DEMO-05', 'lab', 'HbA1c and Lipid Panel', 'Quarterly diabetes monitoring panel',
    'HbA1c of 7.2% shows near-target glycemic control. LDL cholesterol is mildly elevated. Reinforce dietary counseling and recheck lipids in 3 months.',
    ARRAY['Type 2 Diabetes'], ARRAY['Metformin 500mg'], '{"HbA1c":"7.2%","LDL":"128 mg/dL","HDL":"46 mg/dL"}'),
  ('PAT-DEMO-06', 'radiology', 'Sinus X-Ray', 'Imaging for recurrent dust-allergy sinus congestion',
    'Mild mucosal thickening in the maxillary sinuses, consistent with allergic sinusitis. No air-fluid levels or bony abnormality. Conservative management advised.',
    ARRAY['Allergic sinusitis'], ARRAY[]::text[], '{}')
) AS v(patient_ref, report_type, title, description, ai_summary, ai_diseases, ai_medicines, ai_test_results)
JOIN patients pat ON pat.patient_id = v.patient_ref
WHERE NOT EXISTS (SELECT 1 FROM medical_reports WHERE title = v.title AND patient_id = pat.id);

-- Sanity check
SELECT 'prescriptions' AS kind, COUNT(*) FROM prescriptions
UNION ALL SELECT 'prescriptions_per_patient', COUNT(DISTINCT patient_id) FROM prescriptions
UNION ALL SELECT 'prescriptions_per_doctor', COUNT(DISTINCT doctor_id) FROM prescriptions
UNION ALL SELECT 'medical_reports', COUNT(*) FROM medical_reports
UNION ALL SELECT 'medical_reports_per_patient', COUNT(DISTINCT patient_id) FROM medical_reports;
