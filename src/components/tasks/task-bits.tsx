"use client";

import { motion } from "motion/react";
import { CalendarClock } from "lucide-react";
import type { Priority, Task } from "@/lib/types";
import { PRIORITY_COLOR } from "@/lib/constants";
import { dueState, formatDue, formatLong } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function TaskCheckbox({
  checked,
  priority,
  onToggle,
  label,
  size = "md",
}: {
  checked: boolean;
  priority: Priority;
  onToggle: () => void;
  label: string;
  size?: "sm" | "md";
}) {
  const ring = priority === "none" ? "var(--fg-faint)" : PRIORITY_COLOR[priority];
  const dim = size === "sm" ? "h-[17px] w-[17px]" : "h-[19px] w-[19px]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `Mark “${label}” as not done` : `Mark “${label}” as done`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="group/check relative -m-1.5 grid shrink-0 place-items-center rounded-full p-1.5"
    >
      <motion.span
        className={cn("relative grid place-items-center rounded-full border-[1.5px] transition-colors", dim)}
        style={{
          borderColor: checked ? "var(--accent)" : ring,
          background: checked ? "var(--accent)" : "transparent",
        }}
        animate={checked ? { scale: [1, 0.82, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        whileTap={{ scale: 0.86 }}
      >
        <span
          className="absolute inset-[3px] rounded-full opacity-0 transition-opacity group-hover/check:opacity-20"
          style={{ background: ring }}
          aria-hidden
        />
        <svg viewBox="0 0 12 12" className="relative h-2.5 w-2.5" aria-hidden>
          <motion.path
            d="M2.5 6.2 5 8.6l4.6-5"
            fill="none"
            stroke={checked ? "var(--accent-fg)" : ring}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ duration: 0.25, delay: checked ? 0.08 : 0 }}
          />
        </svg>
      </motion.span>
    </button>
  );
}

export function DueBadge({ task, now, className }: { task: Task; now: Date; className?: string }) {
  if (!task.dueDate) return null;
  const state = task.completed ? "later" : dueState(task.dueDate, task.hasTime, now);
  const tone =
    state === "overdue"
      ? "text-danger"
      : state === "today"
        ? "text-accent"
        : state === "tomorrow"
          ? "text-warn"
          : "text-fg-faint";
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap", tone, className)}
      title={formatLong(task.dueDate, task.hasTime)}
    >
      <CalendarClock className="h-3 w-3" aria-hidden />
      <span>
        <span className="sr-only">{state === "overdue" ? "Overdue, due " : "Due "}</span>
        {formatDue(task.dueDate, task.hasTime, now)}
      </span>
    </span>
  );
}
