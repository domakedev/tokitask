import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserData } from '../types';

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  authError: string | null;
  setUser: (user: User | null) => void;
  setUserData: (data: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  handleSignOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userData: null,
  loading: true,
  authError: null,

  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setLoading: (loading) => set({ loading }),
  setAuthError: (authError) => set({ authError }),

  handleSignOut: async () => {
    const { auth } = await import('../services/firebase');
    if (!auth) {
      console.error('Sign Out Error: Firebase auth is not initialized.');
      return;
    }
    try {
      await auth.signOut();
      set({ user: null, userData: null, authError: null });
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  },
}));