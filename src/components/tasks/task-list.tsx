"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Section } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { TaskItem } from "./task-item";

export function TaskList({
  sections,
  now,
  compact,
  hideWorkspace,
  showCompletedTime,
  className,
}: {
  sections: Section[];
  now: Date;
  compact?: boolean;
  hideWorkspace?: boolean;
  showCompletedTime?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <AnimatePresence initial={false}>
        {sections.map((section) => (
          <motion.section
            key={section.id}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-labelledby={section.title ? `sec-${section.id}` : undefined}
          >
            {section.title && (
              <h2
                id={`sec-${section.id}`}
                className={cn(
                  "mb-2 flex items-center gap-2 px-3 text-[12px] font-medium",
                  section.tone === "danger" ? "text-danger" : "text-fg-muted",
                )}
              >
                {section.title}
                <span className="font-mono text-[11px] text-fg-faint">{section.tasks.length}</span>
              </h2>
            )}
            <ul className="rounded-2xl border border-line bg-surface/70 p-1 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]">
              <AnimatePresence initial={false}>
                {section.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    now={now}
                    compact={compact}
                    hideWorkspace={hideWorkspace}
                    showCompletedTime={showCompletedTime}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  );
}
