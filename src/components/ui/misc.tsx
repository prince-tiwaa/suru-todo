"use client";

import { motion } from "motion/react";
import type { Priority } from "@/lib/types";
import { PRIORITY_COLOR, PRIORITY_LABEL, WORKSPACE_META } from "@/lib/constants";
import type { WorkspaceId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Suru mark: an open progress arc with a leading dot — momentum. */
export function Logo({ className, withWord = true }: { className?: string; withWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
        <rect width="24" height="24" rx="7" fill="var(--accent)" />
        <path d="M16.9 8.2A6 6 0 1 0 18 12" fill="none" stroke="var(--accent-fg)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="17.2" cy="7.6" r="1.7" fill="var(--accent-fg)" />
      </svg>
      {withWord && <span className="text-[15px] font-semibold tracking-tight text-fg">Suru</span>}
    </span>
  );
}

/** Linear-style priority glyph: signal bars, or an alert tile for urgent. */
export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const color = PRIORITY_COLOR[priority];
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5", className)} role="img" aria-label="Urgent priority">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill={color} />
        <rect x="7.1" y="4" width="1.8" height="5.2" rx="0.9" fill="var(--bg)" />
        <circle cx="8" cy="11.3" r="1" fill="var(--bg)" />
      </svg>
    );
  }
  const level = priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0;
  return (
    <svg viewBox="0 0 16 16" className={cn("h-3.5 w-3.5", className)} role="img" aria-label={PRIORITY_LABEL[priority]}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3.5}
          width="3"
          height={4 + i * 3.5}
          rx="1"
          fill={i < level ? color : "var(--border-strong)"}
        />
      ))}
    </svg>
  );
}

export function WorkspaceDot({ id, className }: { id: WorkspaceId; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ background: WORKSPACE_META[id].color }}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center px-6 py-14 text-center", className)}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -z-0 scale-150 rounded-full bg-accent-soft blur-2xl" aria-hidden />
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-fg-muted shadow-md">
          {icon}
        </div>
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-fg-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg border border-line bg-bg-subtle p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
              active ? "text-fg" : "text-fg-faint hover:text-fg-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-md border border-line-strong bg-surface-3 shadow-sm"
                transition={{ type: "spring", stiffness: 600, damping: 40 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
