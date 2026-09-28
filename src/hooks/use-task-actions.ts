"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTasks } from "@/lib/store/tasks";
import { useUi } from "@/lib/store/ui";
import type { SuggestedTask, TaskDraft } from "@/lib/types";
import { pluralize } from "@/lib/utils";

/**
 * All user-facing task mutations go through here so every action gets
 * consistent feedback (toasts, undo, lingering completed rows).
 */
export function useTaskActions() {
  const linger = useUi((s) => s.linger);

  const toggle = useCallback(
    (id: string) => {
      const store = useTasks.getState();
      const task = store.tasks.find((t) => t.id === id);
      if (!task) return;
      store.toggleTask(id);
      if (!task.completed) {
        linger(id);
        toast.success("Completed", {
          description: task.title,
          action: { label: "Undo", onClick: () => useTasks.getState().toggleTask(id) },
        });
      }
    },
    [linger],
  );

  const remove = useCallback((id: string) => {
    const removed = useTasks.getState().deleteTask(id);
    if (!removed) return;
    useUi.getState().openEditor(null);
    toast("Task deleted", {
      description: removed.title,
      action: { label: "Undo", onClick: () => useTasks.getState().restoreTask(removed) },
    });
  }, []);

  const add = useCallback((draft: TaskDraft, opts: { silent?: boolean } = {}) => {
    const task = useTasks.getState().addTask(draft);
    if (!opts.silent) {
      toast.success("Task added", {
        description: task.title,
        action: { label: "Undo", onClick: () => useTasks.getState().deleteTask(task.id) },
      });
    }
    return task;
  }, []);

  const addSuggestions = useCallback((items: SuggestedTask[], defaults: Partial<TaskDraft> = {}) => {
    if (!items.length) return [];
    const created = useTasks.getState().addTasks(
      items.map((s) => ({
        workspace: defaults.workspace,
        notes: defaults.notes,
        ...s,
        priority: s.priority ?? defaults.priority,
        source: "ai" as const,
      })),
    );
    toast.success(`Added ${pluralize(created.length, "task")}`, {
      action: {
        label: "Undo",
        onClick: () => created.forEach((t) => useTasks.getState().deleteTask(t.id)),
      },
    });
    return created;
  }, []);

  return { toggle, remove, add, addSuggestions };
}
