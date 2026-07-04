-- Health problems mapping table
-- Maps common health problems/symptoms to departments
CREATE TABLE IF NOT EXISTS health_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  icon text DEFAULT 'activity',
  category text DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE health_problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_problems_select" ON health_problems;
CREATE POLICY "health_problems_select" ON health_problems FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "health_problems_insert" ON health_problems;
CREATE POLICY "health_problems_insert" ON health_problems FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "health_problems_update" ON health_problems;
CREATE POLICY "health_problems_update" ON health_problems FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "health_problems_delete" ON health_problems;
CREATE POLICY "health_problems_delete" ON health_problems FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed health problems mapped to existing departments
INSERT INTO health_problems (name, description, department_id, icon, category)
SELECT hp.name, hp.description, d.id, hp.icon, hp.category
FROM (VALUES
  -- Cardiology
  ('Chest Pain', 'Pain or discomfort in the chest area', NULL, 'heart-pulse', 'cardiac'),
  ('Heart Palpitations', 'Irregular or racing heartbeat', NULL, 'heart-pulse', 'cardiac'),
  ('High Blood Pressure', 'Elevated blood pressure readings', NULL, 'heart-pulse', 'cardiac'),
  ('Shortness of Breath', 'Difficulty breathing or breathlessness', NULL, 'heart-pulse', 'cardiac'),
  -- Neurology
  ('Severe Headache', 'Persistent or severe headaches', NULL, 'brain', 'neurological'),
  ('Migraine', 'Recurrent severe headaches with sensitivity to light', NULL, 'brain', 'neurological'),
  ('Dizziness', 'Feeling faint or lightheaded', NULL, 'brain', 'neurological'),
  ('Numbness or Tingling', 'Loss of sensation or pins and needles', NULL, 'brain', 'neurological'),
  -- Orthopedics
  ('Joint Pain', 'Pain in knees, hips, shoulders or other joints', NULL, 'bone', 'orthopedic'),
  ('Back Pain', 'Lower or upper back pain', NULL, 'bone', 'orthopedic'),
  ('Fracture', 'Broken bone or suspected fracture', NULL, 'bone', 'orthopedic'),
  ('Sports Injury', 'Injury from sports or physical activity', NULL, 'bone', 'orthopedic'),
  -- Gastroenterology
  ('Stomach Pain', 'Abdominal pain or cramps', NULL, 'stomach', 'gastro'),
  ('Acid Reflux', 'Heartburn or acid indigestion', NULL, 'stomach', 'gastro'),
  ('Nausea and Vomiting', 'Feeling sick or vomiting', NULL, 'stomach', 'gastro'),
  ('Diarrhea', 'Loose or frequent bowel movements', NULL, 'stomach', 'gastro'),
  -- Pulmonology
  ('Persistent Cough', 'Cough lasting more than a week', NULL, 'wind', 'respiratory'),
  ('Asthma', 'Breathing difficulty with wheezing', NULL, 'wind', 'respiratory'),
  ('Wheezing', 'Whistling sound while breathing', NULL, 'wind', 'respiratory'),
  -- Dermatology
  ('Skin Rash', 'Red, itchy, or irritated skin', NULL, 'hand', 'dermatology'),
  ('Acne', 'Pimples or skin breakouts', NULL, 'hand', 'dermatology'),
  ('Skin Allergy', 'Allergic skin reactions', NULL, 'hand', 'dermatology'),
  -- ENT
  ('Ear Pain', 'Pain or discomfort in the ear', NULL, 'ear', 'ent'),
  ('Sore Throat', 'Pain or irritation in the throat', NULL, 'ear', 'ent'),
  ('Hearing Loss', 'Difficulty hearing or ringing in ears', NULL, 'ear', 'ent'),
  -- Ophthalmology
  ('Eye Pain', 'Pain or discomfort in the eyes', NULL, 'eye', 'ophthalmology'),
  ('Blurred Vision', 'Difficulty seeing clearly', NULL, 'eye', 'ophthalmology'),
  ('Eye Redness', 'Red or bloodshot eyes', NULL, 'eye', 'ophthalmology'),
  -- Pediatrics
  ('Child Fever', 'Fever in children', NULL, 'thermometer', 'pediatrics'),
  ('Child Vaccination', 'Vaccination for children', NULL, 'thermometer', 'pediatrics'),
  -- General Medicine
  ('Fever', 'Elevated body temperature', NULL, 'thermometer', 'general'),
  ('General Check-up', 'Routine health check-up', NULL, 'stethoscope', 'general'),
  ('Fatigue', 'Persistent tiredness or low energy', NULL, 'battery-low', 'general'),
  ('Diabetes Management', 'Blood sugar management', NULL, 'droplet', 'general')
) AS hp(name, description, department_id, icon, category)
JOIN departments d ON (
  (hp.category = 'cardiac' AND d.name = 'Cardiology') OR
  (hp.category = 'neurological' AND d.name = 'Neurology') OR
  (hp.category = 'orthopedic' AND d.name = 'Orthopedics') OR
  (hp.category = 'gastro' AND d.name = 'Gastroenterology') OR
  (hp.category = 'respiratory' AND d.name = 'Pulmonology') OR
  (hp.category = 'dermatology' AND d.name = 'Dermatology') OR
  (hp.category = 'ent' AND d.name = 'ENT') OR
  (hp.category = 'ophthalmology' AND d.name = 'Ophthalmology') OR
  (hp.category = 'pediatrics' AND d.name = 'Pediatrics') OR
  (hp.category = 'general' AND d.name = 'General Medicine')
)
ON CONFLICT (name) DO NOTHING;
