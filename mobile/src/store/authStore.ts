import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
import { API } from '../constants/api';

const STORAGE_KEY = 'taskflow-mobile-auth';

interface AuthState {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  currentUser:     null,
  token:           null,
  isAuthenticated: false,
  isLoading:       false,
  error:           null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(API.login, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        set({ isLoading: false, error: 'Invalid email or password.' });
        return;
      }

      const { token, user } = (await res.json()) as {
        token: string;
        user: { id: string; name: string; email: string; colour: string; role: string };
      };

      const authUser: User = {
        id: user.id, _id: user.id, name: user.name,
        email: user.email, colour: user.colour, role: user.role as User['role'],
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: authUser }));
      set({ currentUser: authUser, token, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Could not reach the server. Check your connection.' });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ currentUser: null, token: null, isAuthenticated: false, error: null });
  },

  restoreSession: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const { token, user } = JSON.parse(raw) as { token: string; user: User };
      set({ currentUser: user, token, isAuthenticated: true });
    } catch {
      // Corrupt storage — start fresh
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  },

  clearError: () => set({ error: null }),
}));
