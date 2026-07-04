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

15 tables with full RLS policies:
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

## Getting Started

The dev server runs automatically. Open the browser and navigate to the app URL.

```bash
npm install
npm run build
```

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
│   ├── admin/       # Admin pages
│   ├── auth/        # Authentication pages
│   ├── doctor/      # Doctor pages
│   ├── patient/     # Patient pages
│   └── shared/      # Shared pages (appointments, video)
├── store/           # Zustand stores
└── types/           # TypeScript types
```
