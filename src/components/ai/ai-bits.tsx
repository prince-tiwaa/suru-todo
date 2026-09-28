"use client";

import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck, Plus } from "lucide-react";
import type { SuggestedTask } from "@/lib/types";
import { formatDue } from "@/lib/dates";
import { useAiStatus } from "@/hooks/use-misc";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { PriorityIcon } from "../ui/misc";
import { Tooltip } from "../ui/menu";

/** Tiny, safe markdown renderer: paragraphs, **bold**, *italic*, bullet and numbered lists. */
export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={blocks.length}
        className={cn("my-2 space-y-1.5 pl-5", list.ordered ? "list-decimal marker:text-fg-faint" : "list-disc marker:text-fg-faint")}
      >
        {list.items.map((it, i) => (
          <li key={i} className="pl-0.5">
            {inline(it)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length} className="my-2 first:mt-0 last:mb-0">{inline(line)}</p>);
  }
  flush();
  return <div className="text-[13.5px] leading-relaxed text-fg-muted [&_strong]:font-medium [&_strong]:text-fg">{blocks}</div>;
}

function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

/** Selectable list of AI-suggested tasks with "Add selected" / "Add all". */
export function SuggestionList({
  tasks,
  onAdd,
  now,
  editable,
  onEdit,
}: {
  tasks: SuggestedTask[];
  onAdd: (tasks: SuggestedTask[]) => void;
  now: Date;
  editable?: boolean;
  onEdit?: (index: number, title: string) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(tasks.map((_, i) => i)));
  const [added, setAdded] = useState<Set<number>>(new Set());

  const remaining = tasks.map((_, i) => i).filter((i) => !added.has(i));
  const chosen = remaining.filter((i) => selected.has(i));

  function commit(indices: number[]) {
    if (!indices.length) return;
    onAdd(indices.map((i) => tasks[i]));
    setAdded(new Set([...added, ...indices]));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2/50">
      <ul className="divide-y divide-line">
        {tasks.map((t, i) => {
          const isAdded = added.has(i);
          const isSel = selected.has(i);
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.045, 0.4), duration: 0.25 }}
              className={cn("flex items-center gap-2.5 px-3 py-2", isAdded && "opacity-55")}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={isAdded || isSel}
                aria-label={`Select “${t.title}”`}
                disabled={isAdded}
                onClick={() => {
                  const next = new Set(selected);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  setSelected(next);
                }}
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors",
                  isAdded || isSel ? "border-accent bg-accent text-accent-fg" : "border-line-strong hover:border-fg-faint",
                )}
              >
                {(isAdded || isSel) && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              {editable && !isAdded ? (
                <input
                  value={t.title}
                  onChange={(e) => onEdit?.(i, e.target.value)}
                  aria-label={`Edit suggestion ${i + 1}`}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none"
                />
              ) : (
                <span className="min-w-0 flex-1 text-[13px] text-fg">{t.title}</span>
              )}
              {t.dueDate && (
                <span className="shrink-0 text-[11.5px] text-fg-faint">{formatDue(t.dueDate, t.hasTime, now)}</span>
              )}
              {t.priority && t.priority !== "none" && <PriorityIcon priority={t.priority} />}
              {isAdded ? (
                <span className="shrink-0 text-[11px] font-medium text-accent">Added</span>
              ) : (
                <Tooltip content="Add this task">
                  <button
                    type="button"
                    onClick={() => commit([i])}
                    aria-label={`Add “${t.title}”`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-surface-3 hover:text-accent"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              )}
            </motion.li>
          );
        })}
      </ul>
      <AnimatePresence initial={false}>
        {remaining.length > 0 ? (
          <motion.div
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-end gap-1.5 border-t border-line bg-surface/60 px-2 py-2"
          >
            <Button size="xs" variant="ghost" onClick={() => commit(chosen)} disabled={!chosen.length}>
              Add selected ({chosen.length})
            </Button>
            <Button size="xs" variant="primary" onClick={() => commit(remaining)}>
              <CheckCheck className="h-3 w-3" /> Add all
            </Button>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-1.5 border-t border-line py-2 text-[12px] text-accent"
          >
            <Check className="h-3.5 w-3.5" /> All added to your list
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AiModeBadge({ className }: { className?: string }) {
  const status = useAiStatus();
  if (!status) return null;
  const live = status.mode === "live";
  return (
    <Tooltip
      content={
        live ? `Connected to ${status.provider} · ${status.model}` : "No API key configured — using Suru's built-in demo intelligence"
      }
    >
      <span
        tabIndex={0}
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full border px-1.5 font-mono text-[10px] uppercase tracking-[0.06em]",
          live ? "border-[var(--accent-ring)] text-accent" : "border-line-strong text-fg-faint",
          className,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-accent" : "bg-fg-faint")} />
        {live ? "Live" : "Demo"}
      </span>
    </Tooltip>
  );
}

export function ThinkingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-live="polite" aria-busy="true">
      <span className="sr-only">Suru AI is thinking…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <div className="skeleton h-4 w-4 rounded-[5px]" />
          <div className="skeleton h-3.5 rounded" style={{ width: `${55 + ((i * 17) % 35)}%`, animationDelay: `${i * 90}ms` }} />
        </div>
      ))}
    </div>
  );
}
