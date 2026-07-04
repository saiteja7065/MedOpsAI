import { supabase } from './supabase';

const DEMO_USERS = [
  {
    email: 'admin@medicore.health',
    password: 'Admin@MediCore2026',
    userData: { full_name: 'Admin User', role: 'admin', phone: '+1234567890' },
  },
  {
    email: 'doctor@medicore.health',
    password: 'Doctor@MediCore2026',
    userData: { full_name: 'Dr. Sarah Smith', role: 'doctor', phone: '+1234567891' },
  },
  {
    email: 'patient@medicore.health',
    password: 'Patient@MediCore2026',
    userData: { full_name: 'John Doe', role: 'patient', phone: '+1234567892' },
  },
];

export async function seedDemoUsers() {
  const results: any[] = [];

  for (const demo of DEMO_USERS) {
    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: demo.email,
      password: demo.password,
    });

    if (!signInError && signInData.user) {
      results.push({ email: demo.email, status: 'exists' });
      continue;
    }

    // User doesn't exist - create via signUp
    const { data, error } = await supabase.auth.signUp({
      email: demo.email,
      password: demo.password,
      options: { data: demo.userData },
    });

    if (error) {
      results.push({ email: demo.email, status: 'error', error: error.message });
      continue;
    }

    results.push({ email: demo.email, status: 'created', id: data.user?.id });
  }

  return results;
}
