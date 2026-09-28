"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Task, TaskDraft } from "../types";
import { uid } from "../utils";
import { createDemoTasks } from "../demo-data";
import { safeLocalStorage } from "./storage";

interface TasksState {
  tasks: Task[];
  /** True once the first-run seed has happened (demo or clean slate). */
  seeded: boolean;
  /** True while the workspace contains the generated sample tasks. */
  isDemo: boolean;

  addTask: (draft: TaskDraft) => Task;
  addTasks: (drafts: TaskDraft[]) => Task[];
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => Task | undefined;
  restoreTask: (task: Task) => void;
  clearCompleted: () => Task[];
  loadDemo: () => void;
  clearAll: () => void;
  ensureSeeded: () => void;
}

function build(draft: TaskDraft): Task {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: draft.title.trim(),
    notes: draft.notes?.trim() || undefined,
    completed: false,
    createdAt: now,
    updatedAt: now,
    dueDate: draft.dueDate,
    hasTime: draft.dueDate ? !!draft.hasTime : false,
    priority: draft.priority ?? "none",
    workspace: draft.workspace ?? "personal",
    tags: draft.tags ?? [],
    source: draft.source ?? "manual",
  };
}

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      seeded: false,
      isDemo: false,

      addTask: (draft) => {
        const task = build(draft);
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },

      addTasks: (drafts) => {
        const created = drafts.filter((d) => d.title.trim()).map(build);
        // Keep the given order at the top of the list
        set((s) => ({ tasks: [...created, ...s.tasks] }));
        return created;
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
          ),
        })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const completed = !t.completed;
            const now = new Date().toISOString();
            return { ...t, completed, completedAt: completed ? now : undefined, updatedAt: now };
          }),
        })),

      deleteTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
        return task;
      },

      restoreTask: (task) =>
        set((s) => (s.tasks.some((t) => t.id === task.id) ? s : { tasks: [task, ...s.tasks] })),

      clearCompleted: () => {
        const removed = get().tasks.filter((t) => t.completed);
        set((s) => ({ tasks: s.tasks.filter((t) => !t.completed) }));
        return removed;
      },

      loadDemo: () => set({ tasks: createDemoTasks(), isDemo: true, seeded: true }),
      clearAll: () => set({ tasks: [], isDemo: false, seeded: true }),

      ensureSeeded: () => {
        if (!get().seeded) get().loadDemo();
      },
    }),
    {
      name: "suru:tasks",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ tasks: s.tasks, seeded: s.seeded, isDemo: s.isDemo }),
      migrate: (persisted) => persisted as TasksState,
    },
  ),
);
