"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ThemePreference } from "../types";
import { safeLocalStorage } from "./storage";

interface SettingsState {
  name: string;
  theme: ThemePreference;
  onboarded: boolean;
  setName: (name: string) => void;
  setTheme: (theme: ThemePreference) => void;
  completeOnboarding: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      name: "",
      theme: "dark",
      onboarded: false,
      setName: (name) => set({ name: name.trim().slice(0, 40) }),
      setTheme: (theme) => set({ theme }),
      completeOnboarding: () => set({ onboarded: true }),
    }),
    {
      name: "suru:settings",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ name: s.name, theme: s.theme, onboarded: s.onboarded }),
    },
  ),
);

export function resolveTheme(pref: ThemePreference): "dark" | "light" {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
