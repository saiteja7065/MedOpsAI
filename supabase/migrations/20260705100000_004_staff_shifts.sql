
/*
# Staff Scheduling

1. New Table
   - `staff_shifts` - Day-specific shift assignments for doctors, distinct
     from `doctors.available_days`/`morning_start`/etc which only describe
     a recurring weekly pattern, not which specific days are covered.
     Completes "smart scheduling for staff, beds, and OTs" as one
     deliverable — beds and OTs already have real assignment boards,
     staff didn't.

2. Security
   - RLS enabled
   - Admins create/update/delete shifts (assignment is an admin action,
     same as beds/OTs)
   - A doctor can also update their own shift (e.g. mark themselves
     absent) but cannot create or delete assignments
   - Doctors and admins can both read

3. Important Notes
   - UNIQUE(doctor_id, shift_date, shift_type) prevents double-booking the
     same doctor into the same block twice
   - The actual allocation (who gets assigned which day/block) is computed
     deterministically client-side from each doctor's existing
     available_days/morning_start/evening_start — no AI involved, this is
     a scheduling/allocation problem, not a language problem
*/

CREATE TABLE IF NOT EXISTS staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('morning', 'evening', 'on_call')),
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'absent', 'cancelled')) DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, shift_date, shift_type)
);

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_shifts_select" ON staff_shifts;
CREATE POLICY "staff_shifts_select" ON staff_shifts FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = staff_shifts.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "staff_shifts_insert" ON staff_shifts;
CREATE POLICY "staff_shifts_insert" ON staff_shifts FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "staff_shifts_update" ON staff_shifts;
CREATE POLICY "staff_shifts_update" ON staff_shifts FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = staff_shifts.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "staff_shifts_delete" ON staff_shifts;
CREATE POLICY "staff_shifts_delete" ON staff_shifts FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE OR REPLACE TRIGGER staff_shifts_updated_at BEFORE UPDATE ON staff_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_staff_shifts_doctor ON staff_shifts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(shift_date);
