# AI Hospital Administration OS

A production-ready, AI-powered hospital administration operating system built with React, TypeScript, and Supabase.

## Features

### Multi-Role Authentication
- JWT-based authentication with Supabase Auth
- Three roles: Admin, Doctor, Patient
- Role-based access control throughout the app
- Login, Register, Forgot Password flows

### Admin Dashboard
- Real-time hospital overview with key metrics
- Total patients, doctors, appointments, beds, OTs
- Revenue tracking and emergency case monitoring
- Interactive analytics charts (appointments, revenue, bed occupancy, OT utilization)
- AI Admin Copilot for natural language queries
- Manage doctors, patients, departments, appointments
- Bed management with drag-and-drop status changes
- Operation theatre management with scheduling

### Doctor Dashboard
- Today's appointments and patient queue
- Pending appointment approvals (accept/reject)
- Video consultation management
- Patient records and medical reports
- Prescription writing during video calls
- Performance metrics

### Patient Dashboard
- Upcoming and past appointments
- AI-powered symptom triage before booking
- Book appointments with department/doctor selection
- Video consultation requests
- Medical report upload with AI OCR analysis
- Prescription history with medicine details
- 24/7 AI Health Assistant

### AI Features
- **AI Health Assistant**: 24/7 chatbot for symptom assessment, triage recommendations, and emergency detection
- **AI Triage**: Pre-appointment questionnaire analyzing age, symptoms, duration, temperature, pain level, and medical history to recommend department, doctor, priority, and wait time
- **AI Admin Copilot**: Natural language queries about hospital operations (appointments, beds, revenue, reports)
- **AI Medical Report Analysis**: Simulated OCR extraction with disease/medicine highlighting and test result parsing
- **Emergency Detection**: Automatic emergency alerts for critical symptoms

### Medical Coding & Claims Automation (AI-assisted)
- **Clinical note → AI coding**: doctors write a clinical note (Doctor → Medical Coding) and request ICD-10/CPT suggestions from a real LLM call (Groq), each with a confidence score and a rationale quoting the note — not mocked output
- **Human-in-the-loop confirmation**: suggested codes are checked/unchecked and confirmed by the doctor before anything becomes billable, satisfying the "explainable, human-approved coding" requirement
- **Claims workflow**: confirmed codes raise a draft claim; Admin → Claims runs deterministic payer-rule validation (required fields, code format, amount thresholds), computes an explainable denial-risk score, and only then allows Submit — every status change is written to an immutable audit log by a database trigger, not application code
- **Simulated payer decision**: since there's no live payer integration, Admin can mark a submitted claim Approved/Denied to model the response and track denial reasons over time

### Video Consultation
- WebRTC-based video calls with camera/mic controls
- In-call chat messaging
- Prescription panel for doctors
- Screen sharing support
- Call timer and connection status

### Design
- Modern SaaS UI with glassmorphism effects
- Dark mode support
- Framer Motion animations
- Responsive design (mobile to desktop)
- Command palette (Cmd+K) for quick navigation
- Floating AI assistant widget
- Professional charts with Recharts
- Loading skeletons and empty states
- Notification system with unread badges

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **State**: Zustand (auth/UI), React Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Animations**: Framer Motion

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@medicore.health | Admin@MediCore2026 |
| Doctor | doctor@medicore.health | Doctor@MediCore2026 |
| Patient | patient@medicore.health | Patient@MediCore2026 |

## Database Schema

19 tables with full RLS policies. Core hospital schema (15 tables):
- `profiles` - User profiles linked to auth.users
- `departments` - Hospital departments
- `doctors` - Doctor profiles with specialization
- `patients` - Patient profiles with medical history
- `rooms` - Hospital rooms
- `beds` - Bed inventory with real-time status
- `operation_theatres` - OT management
- `appointments` - Appointment scheduling
- `medical_reports` - Uploaded medical documents
- `prescriptions` - Doctor prescriptions
- `clinical_notes` - Doctor clinical notes
- `video_sessions` - Video consultation sessions
- `notifications` - System notifications
- `ai_conversations` - AI assistant history
- `analytics_snapshots` - Pre-computed analytics

Medical coding & claims (4 tables):
- `payer_rules` - Deterministic validation rules claims are checked against (required fields, code format, amount thresholds)
- `coding_suggestions` - AI-suggested ICD-10/CPT codes per clinical note, with confidence + rationale, and the doctor-confirmed final set
- `claims` - Insurance claims built from confirmed codes, carrying validation results and a denial-risk score
- `claim_audit_log` - Append-only log of every claim status change, written by a trigger (not application code) so it can't be bypassed

## Getting Started

1. **Create a Supabase project** at [supabase.com](https://supabase.com) and copy `.env.example` to `.env`, filling in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API.
2. **Run the migrations** in `supabase/migrations/` against your project, in order — either via the Supabase SQL editor (paste each file) or with the [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase db push`.
3. **Set the Groq secret** the AI coding/claims edge functions depend on (get a free key at [console.groq.com/keys](https://console.groq.com/keys)):
   ```bash
   supabase secrets set GROQ_API_KEY=your-groq-key
   ```
4. **Deploy the edge functions**:
   ```bash
   supabase functions deploy medical-coding
   supabase functions deploy validate-claim
   supabase functions deploy seed-demo-users
   ```
5. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```

Without steps 1-4 the app has no backend to talk to — `npm run build` will still succeed (it doesn't touch the network), but the running app needs a live Supabase project.

## Project Structure

```
src/
├── components/
│   ├── ai/          # AI Assistant widget
│   ├── layout/      # Dashboard layout, sidebar, topbar
│   └── ui/          # Reusable UI components
├── lib/
│   ├── ai.ts        # AI triage and health assistant logic
│   ├── api.ts       # Supabase API wrappers
│   ├── supabase.ts  # Supabase client
│   └── utils.ts     # Utility functions
├── pages/
│   ├── admin/       # Admin pages (incl. ClaimsManagement.tsx)
│   ├── auth/        # Authentication pages
│   ├── doctor/      # Doctor pages (incl. ClinicalCoding.tsx)
│   ├── patient/     # Patient pages
│   └── shared/      # Shared pages (appointments, video)
├── store/           # Zustand stores
└── types/           # TypeScript types
```
