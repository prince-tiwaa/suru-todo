"use client";

import { create } from "zustand";
import type { ListFilters, ViewId } from "../types";

export const DEFAULT_FILTERS: ListFilters = {
  query: "",
  priorities: [],
  tag: null,
  sort: "smart",
  status: "active",
};

type Dialog = "settings" | "shortcuts" | "breakdown" | "confirm-reset" | "confirm-clear-completed" | null;

interface UiState {
  view: ViewId;
  aiOpen: boolean;
  /** A prompt queued for the assistant (e.g. "Break down: <task>") */
  aiPrompt: string | null;
  editingId: string | null;
  dialog: Dialog;
  breakdownGoal: string;
  filters: ListFilters;
  /** Increments to ask the command bar to take focus. */
  focusNonce: number;
  mobileMenuOpen: boolean;
  /** Tasks just completed stay visible briefly so the change can be seen. */
  lingering: string[];

  setView: (view: ViewId) => void;
  setAiOpen: (open: boolean) => void;
  askAi: (prompt: string) => void;
  consumeAiPrompt: () => string | null;
  openEditor: (id: string | null) => void;
  openDialog: (d: Dialog) => void;
  openBreakdown: (goal: string) => void;
  setFilters: (patch: Partial<ListFilters>) => void;
  resetFilters: () => void;
  focusCommandBar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  linger: (id: string, ms?: number) => void;
}

export const useUi = create<UiState>()((set, get) => ({
  view: "home",
  aiOpen: false,
  aiPrompt: null,
  editingId: null,
  dialog: null,
  breakdownGoal: "",
  filters: DEFAULT_FILTERS,
  focusNonce: 0,
  mobileMenuOpen: false,
  lingering: [],

  setView: (view) =>
    set((s) => ({
      view,
      mobileMenuOpen: false,
      filters: {
        ...DEFAULT_FILTERS,
        query: s.filters.query && s.view === view ? s.filters.query : "",
        status: view === "completed" ? "completed" : "active",
      },
    })),
  setAiOpen: (aiOpen) => set({ aiOpen }),
  askAi: (prompt) => set({ aiOpen: true, aiPrompt: prompt }),
  consumeAiPrompt: () => {
    const p = get().aiPrompt;
    if (p) set({ aiPrompt: null });
    return p;
  },
  openEditor: (editingId) => set({ editingId }),
  openDialog: (dialog) => set({ dialog }),
  openBreakdown: (breakdownGoal) => set({ dialog: "breakdown", breakdownGoal }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () =>
    set((s) => ({ filters: { ...DEFAULT_FILTERS, status: s.view === "completed" ? "completed" : "active" } })),
  focusCommandBar: () => set((s) => ({ focusNonce: s.focusNonce + 1 })),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  linger: (id, ms = 1800) => {
    set((s) => ({ lingering: [...s.lingering.filter((x) => x !== id), id] }));
    setTimeout(() => set((s) => ({ lingering: s.lingering.filter((x) => x !== id) })), ms);
  },
}));
