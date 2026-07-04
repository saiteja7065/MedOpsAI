export type UserRole = 'admin' | 'doctor' | 'patient';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
