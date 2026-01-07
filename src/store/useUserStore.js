import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,

      setUser: (userData) => set({ user: userData }),

      logout: () => set({ user: null }),
    }),
    {
      name: "user-storage", 
    }
  )
);
