
/*
# Hospital Administration OS - Core Schema

1. New Tables
   - `profiles` - Extended user profiles linked to auth.users (role, personal info)
   - `departments` - Hospital departments (Cardiology, Neurology, etc.)
   - `doctors` - Doctor profiles with specialization, schedule
   - `patients` - Patient profiles with medical history
   - `beds` - Hospital bed inventory with status
   - `rooms` - Hospital rooms containing beds
   - `operation_theatres` - OT management
   - `appointments` - Appointment scheduling
   - `medical_reports` - Uploaded medical documents
   - `prescriptions` - Doctor prescriptions
   - `clinical_notes` - Doctor clinical notes per appointment
   - `video_sessions` - Video consultation sessions
   - `notifications` - System notifications
   - `ai_conversations` - AI health assistant conversation history

2. Security
   - RLS enabled on all tables
   - Role-based access via profiles.role
   - Authenticated users can access their own data
   - Admins can access all data

3. Important Notes
   - Uses auth.uid() for ownership
   - Profiles auto-created on user signup via trigger
*/

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
  phone text,
  avatar_url text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  address text,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id OR EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  head_doctor_id uuid,
  floor_number integer DEFAULT 1,
  room_count integer DEFAULT 0,
  icon text DEFAULT 'stethoscope',
  color text DEFAULT '#3B82F6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select" ON departments;
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_insert" ON departments;
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "departments_update" ON departments;
CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "departments_delete" ON departments;
CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  employee_id text UNIQUE NOT NULL,
  specialization text NOT NULL,
  qualification text NOT NULL,
  experience_years integer DEFAULT 0,
  consultation_fee numeric(10,2) DEFAULT 500,
  bio text,
  languages text[] DEFAULT ARRAY['English'],
  available_days text[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
  morning_start time DEFAULT '09:00',
  morning_end time DEFAULT '13:00',
  evening_start time DEFAULT '17:00',
  evening_end time DEFAULT '20:00',
  slot_duration_minutes integer DEFAULT 30,
  max_patients_per_day integer DEFAULT 20,
  is_available boolean NOT NULL DEFAULT true,
  rating numeric(3,2) DEFAULT 4.5,
  total_consultations integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctors_select" ON doctors;
CREATE POLICY "doctors_select" ON doctors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "doctors_insert" ON doctors;
CREATE POLICY "doctors_insert" ON doctors FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','doctor')));

DROP POLICY IF EXISTS "doctors_update" ON doctors;
CREATE POLICY "doctors_update" ON doctors FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "doctors_delete" ON doctors;
CREATE POLICY "doctors_delete" ON doctors FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id text UNIQUE NOT NULL,
  blood_group text CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  allergies text[],
  chronic_conditions text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_number text,
  insurance_expiry date,
  is_admitted boolean DEFAULT false,
  admitted_bed_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select" ON patients FOR SELECT TO authenticated USING (profile_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','doctor')));

DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "patients_update" ON patients;
CREATE POLICY "patients_update" ON patients FOR UPDATE TO authenticated USING (profile_id = auth.uid() OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','doctor')));

DROP POLICY IF EXISTS "patients_delete" ON patients;
CREATE POLICY "patients_delete" ON patients FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ROOMS TABLE
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text UNIQUE NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('general','private','icu','emergency','semi_private')),
  floor_number integer DEFAULT 1,
  department_id uuid REFERENCES departments(id),
  capacity integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select" ON rooms;
CREATE POLICY "rooms_select" ON rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rooms_insert" ON rooms;
CREATE POLICY "rooms_insert" ON rooms FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rooms_update" ON rooms;
CREATE POLICY "rooms_update" ON rooms FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rooms_delete" ON rooms;
CREATE POLICY "rooms_delete" ON rooms FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- BEDS TABLE
CREATE TABLE IF NOT EXISTS beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_number text NOT NULL,
  room_id uuid REFERENCES rooms(id),
  bed_type text NOT NULL CHECK (bed_type IN ('general','icu','emergency','private','semi_private')) DEFAULT 'general',
  status text NOT NULL CHECK (status IN ('available','occupied','reserved','cleaning','maintenance')) DEFAULT 'available',
  floor_number integer DEFAULT 1,
  patient_id uuid REFERENCES patients(id),
  admitted_at timestamptz,
  expected_discharge date,
  notes text,
  features text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beds_select" ON beds;
CREATE POLICY "beds_select" ON beds FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "beds_insert" ON beds;
CREATE POLICY "beds_insert" ON beds FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "beds_update" ON beds;
CREATE POLICY "beds_update" ON beds FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','doctor')));

DROP POLICY IF EXISTS "beds_delete" ON beds;
CREATE POLICY "beds_delete" ON beds FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- OPERATION THEATRES TABLE
CREATE TABLE IF NOT EXISTS operation_theatres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_number text UNIQUE NOT NULL,
  name text NOT NULL,
  department_id uuid REFERENCES departments(id),
  status text NOT NULL CHECK (status IN ('available','occupied','maintenance','cleaning','emergency')) DEFAULT 'available',
  floor_number integer DEFAULT 1,
  capacity integer DEFAULT 5,
  features text[] DEFAULT ARRAY[]::text[],
  current_doctor_id uuid REFERENCES doctors(id),
  current_patient_id uuid REFERENCES patients(id),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  surgery_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operation_theatres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ots_select" ON operation_theatres;
CREATE POLICY "ots_select" ON operation_theatres FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ots_insert" ON operation_theatres;
CREATE POLICY "ots_insert" ON operation_theatres FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "ots_update" ON operation_theatres;
CREATE POLICY "ots_update" ON operation_theatres FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','doctor')));

DROP POLICY IF EXISTS "ots_delete" ON operation_theatres;
CREATE POLICY "ots_delete" ON operation_theatres FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_number text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid NOT NULL REFERENCES doctors(id),
  department_id uuid REFERENCES departments(id),
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  duration_minutes integer DEFAULT 30,
  type text NOT NULL CHECK (type IN ('in_person','video','emergency')) DEFAULT 'in_person',
  status text NOT NULL CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','missed','rescheduled')) DEFAULT 'pending',
  priority text NOT NULL CHECK (priority IN ('normal','urgent','emergency')) DEFAULT 'normal',
  reason text NOT NULL,
  symptoms text[],
  notes text,
  ai_triage_data jsonb,
  video_session_id uuid,
  cancelled_by text,
  cancelled_reason text,
  rescheduled_from uuid REFERENCES appointments(id),
  fee numeric(10,2) DEFAULT 500,
  is_paid boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = appointments.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = appointments.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM patients WHERE id = appointments.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = appointments.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = appointments.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MEDICAL REPORTS TABLE
CREATE TABLE IF NOT EXISTS medical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid REFERENCES doctors(id),
  appointment_id uuid REFERENCES appointments(id),
  report_type text NOT NULL CHECK (report_type IN ('lab','radiology','pathology','prescription','discharge_summary','consultation','other')),
  title text NOT NULL,
  description text,
  file_url text,
  file_name text,
  file_size integer,
  ai_summary text,
  ai_diseases text[],
  ai_medicines text[],
  ai_test_results jsonb,
  is_processed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select" ON medical_reports;
CREATE POLICY "reports_select" ON medical_reports FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = medical_reports.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = medical_reports.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "reports_insert" ON medical_reports;
CREATE POLICY "reports_insert" ON medical_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM patients WHERE id = medical_reports.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors d WHERE d.id = medical_reports.doctor_id AND d.profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "reports_update" ON medical_reports;
CREATE POLICY "reports_update" ON medical_reports FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = medical_reports.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors d WHERE d.id = medical_reports.doctor_id AND d.profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "reports_delete" ON medical_reports;
CREATE POLICY "reports_delete" ON medical_reports FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = medical_reports.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PRESCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid NOT NULL REFERENCES doctors(id),
  diagnosis text NOT NULL,
  medicines jsonb NOT NULL DEFAULT '[]',
  instructions text,
  follow_up_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prescriptions_select" ON prescriptions;
CREATE POLICY "prescriptions_select" ON prescriptions FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = prescriptions.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = prescriptions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "prescriptions_insert" ON prescriptions;
CREATE POLICY "prescriptions_insert" ON prescriptions FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM doctors WHERE id = prescriptions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;
CREATE POLICY "prescriptions_update" ON prescriptions FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = prescriptions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "prescriptions_delete" ON prescriptions;
CREATE POLICY "prescriptions_delete" ON prescriptions FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CLINICAL NOTES TABLE
CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  doctor_id uuid NOT NULL REFERENCES doctors(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  chief_complaint text,
  examination_findings text,
  diagnosis text,
  treatment_plan text,
  tests_ordered text[],
  notes text,
  vitals jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinical_notes_select" ON clinical_notes;
CREATE POLICY "clinical_notes_select" ON clinical_notes FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = clinical_notes.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = clinical_notes.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "clinical_notes_insert" ON clinical_notes;
CREATE POLICY "clinical_notes_insert" ON clinical_notes FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM doctors WHERE id = clinical_notes.doctor_id AND profile_id = auth.uid())
);

DROP POLICY IF EXISTS "clinical_notes_update" ON clinical_notes;
CREATE POLICY "clinical_notes_update" ON clinical_notes FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM doctors WHERE id = clinical_notes.doctor_id AND profile_id = auth.uid())
);

DROP POLICY IF EXISTS "clinical_notes_delete" ON clinical_notes;
CREATE POLICY "clinical_notes_delete" ON clinical_notes FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- VIDEO SESSIONS TABLE
CREATE TABLE IF NOT EXISTS video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id),
  room_id text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id),
  doctor_id uuid NOT NULL REFERENCES doctors(id),
  status text NOT NULL CHECK (status IN ('scheduled','waiting','active','completed','cancelled')) DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  recording_url text,
  transcript text,
  ai_summary text,
  chat_messages jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_sessions_select" ON video_sessions;
CREATE POLICY "video_sessions_select" ON video_sessions FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = video_sessions.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = video_sessions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "video_sessions_insert" ON video_sessions;
CREATE POLICY "video_sessions_insert" ON video_sessions FOR INSERT TO authenticated WITH CHECK (
  EXISTS(SELECT 1 FROM patients WHERE id = video_sessions.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = video_sessions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "video_sessions_update" ON video_sessions;
CREATE POLICY "video_sessions_update" ON video_sessions FOR UPDATE TO authenticated USING (
  EXISTS(SELECT 1 FROM patients WHERE id = video_sessions.patient_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM doctors WHERE id = video_sessions.doctor_id AND profile_id = auth.uid())
  OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "video_sessions_delete" ON video_sessions;
CREATE POLICY "video_sessions_delete" ON video_sessions FOR DELETE TO authenticated USING (
  EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('appointment','video_call','prescription','emergency','system','reminder')) DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- AI CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]',
  triage_data jsonb,
  session_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conv_select" ON ai_conversations;
CREATE POLICY "ai_conv_select" ON ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_conv_insert" ON ai_conversations;
CREATE POLICY "ai_conv_insert" ON ai_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_conv_update" ON ai_conversations;
CREATE POLICY "ai_conv_update" ON ai_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_conv_delete" ON ai_conversations;
CREATE POLICY "ai_conv_delete" ON ai_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ANALYTICS TABLE (for pre-computed stats)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_patients integer DEFAULT 0,
  total_doctors integer DEFAULT 0,
  total_appointments integer DEFAULT 0,
  completed_appointments integer DEFAULT 0,
  cancelled_appointments integer DEFAULT 0,
  beds_occupied integer DEFAULT 0,
  beds_available integer DEFAULT 0,
  ot_utilization numeric(5,2) DEFAULT 0,
  revenue numeric(12,2) DEFAULT 0,
  emergency_cases integer DEFAULT 0,
  video_consultations integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_select" ON analytics_snapshots;
CREATE POLICY "analytics_select" ON analytics_snapshots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "analytics_insert" ON analytics_snapshots;
CREATE POLICY "analytics_insert" ON analytics_snapshots FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- AUTO-UPDATE updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER ots_updated_at BEFORE UPDATE ON operation_theatres FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER clinical_notes_updated_at BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors(department_id);
