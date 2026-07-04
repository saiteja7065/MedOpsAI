import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: Profile | null;
  session: any;
  loading: boolean;
  error: string | null;
  setUser: (user: Profile | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      fetchProfile: async (userId: string) => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) {
          console.error('Error fetching profile:', error);
          return null;
        }
        set({ user: data as Profile });
        return data as Profile;
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export function useRole(): UserRole | null {
  return useAuthStore((s) => s.user?.role ?? null);
}
