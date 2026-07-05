
/*
# Fix: doctors couldn't see their own patients' medical reports

`reports_select` only granted a doctor access when `medical_reports.doctor_id`
matched them — but reports are uploaded by patients with no doctor attached
(doctor_id is nullable and the seed data never sets it), and a treating
doctor should be able to see a report regardless of who (if anyone) is
recorded as its doctor_id. This adds an alternative: any doctor who has ever
had an appointment with that patient can read their reports.
*/

DROP POLICY IF EXISTS "reports_select" ON medical_reports;
CREATE POLICY "reports_select" ON medical_reports FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = medical_reports.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = medical_reports.doctor_id AND profile_id = auth.uid())
  OR EXISTS(
    SELECT 1 FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.patient_id = medical_reports.patient_id AND d.profile_id = auth.uid()
  )
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
