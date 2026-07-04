-- Historical appointment data for demand forecasting.
--
-- The forecast feature computes a real trend from real rows in the
-- `appointments` table — it doesn't fabricate numbers. But a fresh demo
-- project only has a handful of appointments (today, tomorrow, last week),
-- which isn't enough history for a trend line to mean anything. This seeds
-- ~10 weeks of past, completed appointments with a rising volume pattern
-- (1/day ten weeks ago, up to ~9/day this week) against whichever doctor,
-- patient, and department already exist in your project — so the forecast
-- has real historical signal to compute from.
--
-- Safe to re-run: appointment_number is unique, so a second run just skips
-- rows that already exist.
--
-- Run this AFTER supabase/seed/demo_seed.sql (needs at least one doctor,
-- patient, and department already in place).

WITH doc AS (
  SELECT id AS doctor_id FROM doctors LIMIT 1
), pat AS (
  SELECT id AS patient_id FROM patients LIMIT 1
), dept AS (
  SELECT id AS department_id FROM departments LIMIT 1
), days AS (
  SELECT generate_series(1, 69) AS day_offset
), daily_counts AS (
  SELECT
    day_offset,
    (CURRENT_DATE - day_offset) AS appt_date,
    GREATEST(1, ROUND((70 - day_offset) / 8.0)::int) AS appt_count
  FROM days
)
INSERT INTO appointments (
  appointment_number, patient_id, doctor_id, department_id,
  appointment_date, appointment_time, type, status, priority, reason, fee, is_paid
)
SELECT
  'APT-HIST-' || to_char(dc.appt_date, 'YYYYMMDD') || '-' || gs.n,
  (SELECT patient_id FROM pat),
  (SELECT doctor_id FROM doc),
  (SELECT department_id FROM dept),
  dc.appt_date,
  ('09:00'::time + (gs.n || ' hours')::interval)::time,
  'in_person',
  'completed',
  'normal',
  'Routine consultation',
  500,
  true
FROM daily_counts dc
CROSS JOIN LATERAL generate_series(1, dc.appt_count) AS gs(n)
WHERE EXISTS (SELECT 1 FROM doc) AND EXISTS (SELECT 1 FROM pat) AND EXISTS (SELECT 1 FROM dept)
ON CONFLICT (appointment_number) DO NOTHING;

-- Sanity check — should show ~69 days of history with a rising weekly total
SELECT date_trunc('week', appointment_date)::date AS week_of, COUNT(*) AS appointments
FROM appointments
WHERE appointment_number LIKE 'APT-HIST-%'
GROUP BY 1 ORDER BY 1;
