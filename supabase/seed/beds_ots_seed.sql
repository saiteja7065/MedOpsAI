-- Beds, rooms, and OTs across ALL 5 departments. Confirmed empty on the live
-- project as of this version — replaces the earlier single-department draft
-- of this file, which was never actually applied. Safe to re-run
-- (bed_number/room_number/ot_number are all unique).
--
-- Run this AFTER expand_staff_patients_seed.sql (needs the 5 departments and
-- the 6 patients to exist for room/bed/OT department links and occupied-bed
-- patient assignments).

-- ============ Rooms — 2 per department ============
INSERT INTO rooms (room_number, room_type, floor_number, department_id, capacity)
SELECT v.room_number, v.room_type, d.floor_number, d.id, v.capacity
FROM (VALUES
  ('IM-R1',    'general',      4, 'Internal Medicine'),
  ('IM-R2',    'private',      2, 'Internal Medicine'),
  ('CARD-R1',  'icu',          4, 'Cardiology'),
  ('CARD-R2',  'general',      4, 'Cardiology'),
  ('NEURO-R1', 'general',      4, 'Neurology'),
  ('NEURO-R2', 'private',      2, 'Neurology'),
  ('ORTHO-R1', 'general',      6, 'Orthopedics'),
  ('ORTHO-R2', 'semi_private', 2, 'Orthopedics'),
  ('PEDS-R1',  'general',      4, 'Pediatrics'),
  ('PEDS-R2',  'private',      2, 'Pediatrics')
) AS v(room_number, room_type, capacity, dept_name)
JOIN departments d ON d.name = v.dept_name
ON CONFLICT (room_number) DO NOTHING;

-- ============ Beds — 4 per department, mixed statuses, a few occupied ============
INSERT INTO beds (bed_number, room_id, bed_type, status, floor_number, patient_id, admitted_at)
SELECT
  v.bed_number,
  (SELECT id FROM rooms WHERE room_number = v.room_number),
  v.bed_type,
  v.status,
  d.floor_number,
  (SELECT id FROM patients WHERE patient_id = v.patient_ref),
  CASE WHEN v.patient_ref IS NOT NULL THEN now() - (v.days_ago::text || ' days')::interval ELSE NULL END
FROM (VALUES
  ('IM-B1',    'IM-R1',    'general',      'available',   'Internal Medicine', NULL,           NULL),
  ('IM-B2',    'IM-R1',    'general',      'occupied',    'Internal Medicine', 'PAT-DEMO-01',  2),
  ('IM-B3',    'IM-R2',    'private',      'cleaning',    'Internal Medicine', NULL,           NULL),
  ('IM-B4',    'IM-R2',    'private',      'available',   'Internal Medicine', NULL,           NULL),
  ('CARD-B1',  'CARD-R1',  'icu',          'occupied',    'Cardiology',        'PAT-DEMO-02',  1),
  ('CARD-B2',  'CARD-R1',  'icu',          'available',   'Cardiology',        NULL,           NULL),
  ('CARD-B3',  'CARD-R2',  'general',      'reserved',    'Cardiology',        NULL,           NULL),
  ('CARD-B4',  'CARD-R2',  'general',      'available',   'Cardiology',        NULL,           NULL),
  ('NEURO-B1', 'NEURO-R1', 'general',      'available',   'Neurology',         NULL,           NULL),
  ('NEURO-B2', 'NEURO-R1', 'general',      'occupied',    'Neurology',         'PAT-DEMO-03',  3),
  ('NEURO-B3', 'NEURO-R2', 'private',      'maintenance', 'Neurology',         NULL,           NULL),
  ('NEURO-B4', 'NEURO-R2', 'private',      'available',   'Neurology',         NULL,           NULL),
  ('ORTHO-B1', 'ORTHO-R1', 'general',      'available',   'Orthopedics',       NULL,           NULL),
  ('ORTHO-B2', 'ORTHO-R1', 'general',      'available',   'Orthopedics',       NULL,           NULL),
  ('ORTHO-B3', 'ORTHO-R2', 'semi_private', 'occupied',    'Orthopedics',       'PAT-DEMO-04',  1),
  ('ORTHO-B4', 'ORTHO-R2', 'semi_private', 'cleaning',    'Orthopedics',       NULL,           NULL),
  ('PEDS-B1',  'PEDS-R1',  'general',      'available',   'Pediatrics',        NULL,           NULL),
  ('PEDS-B2',  'PEDS-R1',  'general',      'occupied',    'Pediatrics',        'PAT-DEMO-05',  2),
  ('PEDS-B3',  'PEDS-R2',  'private',      'available',   'Pediatrics',        NULL,           NULL),
  ('PEDS-B4',  'PEDS-R2',  'private',      'reserved',    'Pediatrics',        NULL,           NULL)
) AS v(bed_number, room_number, bed_type, status, dept_name, patient_ref, days_ago)
JOIN departments d ON d.name = v.dept_name
ON CONFLICT (bed_number) DO NOTHING;

-- ============ Operation Theatres — 2 per department ============
INSERT INTO operation_theatres (ot_number, name, department_id, status, floor_number, capacity, surgery_type)
SELECT v.ot_number, v.name, d.id, v.status, d.floor_number, v.capacity, v.surgery_type
FROM (VALUES
  ('OT-IM1',    'Internal Medicine Procedure Room', 'Internal Medicine', 'available',   4, 4, NULL),
  ('OT-IM2',    'Internal Medicine Minor OT',        'Internal Medicine', 'cleaning',    4, 4, NULL),
  ('OT-CARD1',  'Cardiac Cath Lab',                  'Cardiology',        'occupied',    8, 6, 'Coronary angiography'),
  ('OT-CARD2',  'Cardiac Surgery Theatre',           'Cardiology',        'available',   8, 6, NULL),
  ('OT-NEURO1', 'Neurosurgery Theatre 1',            'Neurology',         'available',   8, 6, NULL),
  ('OT-NEURO2', 'Neurosurgery Theatre 2',            'Neurology',         'maintenance', 6, 6, NULL),
  ('OT-ORTHO1', 'Orthopedic Surgery Theatre',        'Orthopedics',       'occupied',    8, 6, 'Knee arthroscopy'),
  ('OT-ORTHO2', 'Orthopedic Minor OT',               'Orthopedics',       'available',   6, 4, NULL),
  ('OT-PEDS1',  'Pediatric Surgery Theatre',         'Pediatrics',        'available',   6, 4, NULL),
  ('OT-PEDS2',  'Pediatric Minor Procedures',        'Pediatrics',        'cleaning',    4, 4, NULL)
) AS v(ot_number, name, dept_name, status, floor_number, capacity, surgery_type)
JOIN departments d ON d.name = v.dept_name
ON CONFLICT (ot_number) DO NOTHING;

-- Attach the current operating doctor + a live schedule window to the 2
-- occupied theatres, so OT Management shows something realistic, not just
-- an empty "occupied" status.
UPDATE operation_theatres o
SET current_doctor_id = doc.id, scheduled_start = now() - interval '30 minutes', scheduled_end = now() + interval '90 minutes'
FROM doctors doc
WHERE o.ot_number = 'OT-CARD1' AND doc.employee_id = 'EMP-DEMO-03';

UPDATE operation_theatres o
SET current_doctor_id = doc.id, scheduled_start = now() - interval '45 minutes', scheduled_end = now() + interval '75 minutes'
FROM doctors doc
WHERE o.ot_number = 'OT-ORTHO1' AND doc.employee_id = 'EMP-DEMO-07';

-- Sanity check
SELECT 'rooms' AS kind, COUNT(*) FROM rooms
UNION ALL SELECT 'beds', COUNT(*) FROM beds
UNION ALL SELECT 'beds_occupied', COUNT(*) FROM beds WHERE status = 'occupied'
UNION ALL SELECT 'operation_theatres', COUNT(*) FROM operation_theatres
UNION ALL SELECT 'ots_occupied', COUNT(*) FROM operation_theatres WHERE status = 'occupied';
