"use client";

import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlignLeft,
  Check,
  FolderInput,
  ListTree,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { PRIORITIES, WORKSPACES, WORKSPACE_META } from "@/lib/constants";
import { useTasks } from "@/lib/store/tasks";
import { useUi } from "@/lib/store/ui";
import { ai } from "@/lib/ai/client";
import { useTaskActions } from "@/hooks/use-task-actions";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button, Spinner } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Tooltip } from "../ui/menu";
import { PriorityIcon, WorkspaceDot } from "../ui/misc";
import { DueBadge, TaskCheckbox } from "./task-bits";

interface TaskItemProps {
  task: Task;
  now: Date;
  compact?: boolean;
  hideWorkspace?: boolean;
  showCompletedTime?: boolean;
}

export const TaskItem = forwardRef<HTMLLIElement, TaskItemProps>(function TaskItem(
  { task, now, compact, hideWorkspace, showCompletedTime },
  ref,
) {
  const { toggle, remove } = useTaskActions();
  const openEditor = useUi((s) => s.openEditor);
  const openBreakdown = useUi((s) => s.openBreakdown);
  const updateTask = useTasks((s) => s.updateTask);
  const [enhancing, setEnhancing] = useState(false);
  const [suggestion, setSuggestion] = useState<{ title: string; reason?: string; demo: boolean } | null>(null);

  async function enhance() {
    setEnhancing(true);
    const res = await ai.enhance(task.title, task.notes);
    setEnhancing(false);
    if (res.data.title.trim() === task.title.trim()) {
      toast("This task is already clear", { description: "Suru AI didn't find anything to improve." });
      return;
    }
    setSuggestion({ ...res.data, demo: res.mode === "demo" });
  }

  function applySuggestion() {
    if (!suggestion) return;
    const previous = task.title;
    updateTask(task.id, { title: suggestion.title.replace(/\.$/, "") });
    setSuggestion(null);
    toast.success("Task improved", {
      action: { label: "Undo", onClick: () => useTasks.getState().updateTask(task.id, { title: previous }) },
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const k = e.key.toLowerCase();
    if (k === "x" || k === " ") {
      e.preventDefault();
      toggle(task.id);
    } else if (k === "enter" || k === "e") {
      e.preventDefault();
      openEditor(task.id);
    } else if (k === "delete" || k === "backspace") {
      e.preventDefault();
      if (!focusSibling(e.currentTarget, 1)) focusSibling(e.currentTarget, -1);
      remove(task.id);
    } else if (k === "arrowdown" || k === "j") {
      e.preventDefault();
      focusSibling(e.currentTarget, 1);
    } else if (k === "arrowup" || k === "k") {
      e.preventDefault();
      focusSibling(e.currentTarget, -1);
    }
  }

  const ws = WORKSPACE_META[task.workspace];

  return (
    <motion.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={{ type: "spring", stiffness: 500, damping: 42, mass: 0.7 }}
      className="overflow-hidden"
    >
      <div
        tabIndex={0}
        data-task-row
        role="group"
        aria-label={`${task.title}${task.completed ? ", completed" : ""}`}
        onKeyDown={onKeyDown}
        onClick={() => openEditor(task.id)}
        className={cn(
          "group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 outline-none transition-colors",
          compact ? "py-2.5" : "py-3",
          "hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]",
        )}
      >
        <div className={cn("pt-[1px]", compact && "pt-0")}>
          <TaskCheckbox
            checked={task.completed}
            priority={task.priority}
            onToggle={() => toggle(task.id)}
            label={task.title}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "relative w-fit max-w-full text-[14px] leading-[1.35rem] transition-colors duration-300",
              task.completed ? "text-fg-faint" : "text-fg",
            )}
          >
            <span className="break-words">{task.title}</span>
            <motion.span
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 h-px w-full origin-left bg-fg-faint"
              initial={false}
              animate={{ scaleX: task.completed ? 1 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-faint">
            {task.priority !== "none" && !task.completed && (
              <span className="inline-flex items-center gap-1">
                <PriorityIcon priority={task.priority} />
                <span className="hidden sm:inline">{PRIORITIES.find((p) => p.id === task.priority)?.label}</span>
              </span>
            )}
            {showCompletedTime && task.completedAt ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" aria-hidden /> {relativeTime(task.completedAt, now)}
              </span>
            ) : (
              <DueBadge task={task} now={now} />
            )}
            {!hideWorkspace && (
              <span className="inline-flex items-center gap-1.5">
                <WorkspaceDot id={task.workspace} className="h-1.5 w-1.5" />
                {ws.label}
              </span>
            )}
            {!compact &&
              task.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-fg-faint">
                  #{t}
                </span>
              ))}
            {!compact && task.notes && <AlignLeft className="h-3 w-3" aria-label="Has notes" />}
            {task.source === "ai" && !compact && (
              <span className="inline-flex items-center gap-1 text-fg-faint" title="Created with Suru AI">
                <Sparkles className="h-3 w-3" aria-hidden />
                <span className="sr-only">AI generated</span>
              </span>
            )}
          </div>
        </div>

        {/* Row actions */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 transition-opacity",
            "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100",
            (enhancing || suggestion) && "!opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {!task.completed && !compact && (
            <Tooltip content="Improve with AI">
              <button
                type="button"
                onClick={enhance}
                disabled={enhancing}
                aria-label="Improve task with AI"
                className="hidden h-7 w-7 place-items-center rounded-md text-fg-faint transition-colors hover:bg-surface-3 hover:text-accent sm:grid"
              >
                {enhancing ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
              </button>
            </Tooltip>
          )}
          <Menu>
            <MenuTrigger
              aria-label="Task actions"
              className="grid h-7 w-7 place-items-center rounded-md text-fg-faint transition-colors hover:bg-surface-3 hover:text-fg data-[state=open]:bg-surface-3 data-[state=open]:text-fg"
            >
              <MoreHorizontal className="h-4 w-4" />
            </MenuTrigger>
            <MenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
              <MenuItem onSelect={() => openEditor(task.id)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </MenuItem>
              <MenuItem onSelect={() => toggle(task.id)}>
                {task.completed ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {task.completed ? "Mark as not done" : "Complete"}
              </MenuItem>
              {!task.completed && (
                <>
                  <MenuItem onSelect={enhance}>
                    <Sparkles className="h-3.5 w-3.5" /> Improve with AI
                  </MenuItem>
                  <MenuItem onSelect={() => openBreakdown(task.title)}>
                    <ListTree className="h-3.5 w-3.5" /> Break down with AI
                  </MenuItem>
                </>
              )}
              <MenuSeparator />
              <MenuLabel>Priority</MenuLabel>
              <div className="flex gap-0.5 px-1 pb-1">
                {PRIORITIES.map((p) => (
                  <MenuItem
                    key={p.id}
                    aria-label={p.label}
                    onSelect={() => updateTask(task.id, { priority: p.id })}
                    className={cn("h-7 flex-1 justify-center px-0", task.priority === p.id && "bg-surface-3")}
                  >
                    <PriorityIcon priority={p.id} />
                  </MenuItem>
                ))}
              </div>
              <MenuLabel>Move to</MenuLabel>
              {WORKSPACES.filter((w) => w.id !== task.workspace).map((w) => (
                <MenuItem key={w.id} onSelect={() => updateTask(task.id, { workspace: w.id })}>
                  <FolderInput className="h-3.5 w-3.5" />
                  <WorkspaceDot id={w.id} className="h-1.5 w-1.5" /> {w.label}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem onSelect={() => remove(task.id)} className="text-danger data-[highlighted]:text-danger">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-3 mb-2 ml-10 rounded-xl border border-line bg-accent-soft p-3">
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">
                <Sparkles className="h-3 w-3" /> Suggested {suggestion.demo && <span className="text-fg-faint">· demo</span>}
              </div>
              <p className="mt-1.5 text-[13.5px] leading-snug text-fg">{suggestion.title}</p>
              {suggestion.reason && <p className="mt-1 text-[12px] text-fg-muted">{suggestion.reason}</p>}
              <div className="mt-2.5 flex gap-1.5">
                <Button size="xs" variant="primary" onClick={applySuggestion}>
                  <Check className="h-3 w-3" /> Apply
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setSuggestion(null)}>
                  <X className="h-3 w-3" /> Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
});

function focusSibling(el: HTMLElement, dir: 1 | -1): boolean {
  const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-task-row]"));
  const i = rows.indexOf(el);
  const next = rows[i + dir];
  if (next) {
    next.focus();
    return true;
  }
  return false;
}
