import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

interface AuthState {
  user?: User;
  session?: string;
  setUser: (user?: User) => void;
  setSession: (token?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  session: undefined,
  setUser: (user) => set({ user }),
  setSession: (token) => set({ session: token }),
  logout: () => set({ user: undefined, session: undefined }),
}));
