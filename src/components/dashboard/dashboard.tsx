"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { AlarmClock, ArrowRight, CalendarRange, CheckCircle2, Coffee, Sparkles, Sun } from "lucide-react";
import { useTasks } from "@/lib/store/tasks";
import { useSettings } from "@/lib/store/settings";
import { useUi } from "@/lib/store/ui";
import { compareTasks, dashboardData, isDueToday, type Section } from "@/lib/selectors";
import { dayDiff, greeting } from "@/lib/dates";
import type { SortKey, Task } from "@/lib/types";
import { pluralize, cn } from "@/lib/utils";
import { CommandBar } from "../tasks/command-bar";
import { TaskList } from "../tasks/task-list";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/misc";

const fade = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] as const },
});

export function Dashboard({ now }: { now: Date }) {
  const tasks = useTasks((s) => s.tasks);
  const isDemo = useTasks((s) => s.isDemo);
  const name = useSettings((s) => s.name);
  const lingering = useUi((s) => s.lingering);
  const setView = useUi((s) => s.setView);
  const askAi = useUi((s) => s.askAi);
  const openDialog = useUi((s) => s.openDialog);

  const d = useMemo(() => dashboardData(tasks, now), [tasks, now]);

  // Focus list: overdue + due today. Tasks completed moments ago stay in place
  // (lingering) so the check animation is visible before they glide away.
  const { focusSections, prioritySection } = useMemo(() => {
    const keep = tasks.filter((t) => t.completed && lingering.includes(t.id));
    const stable = (list: Task[], key: SortKey) =>
      [...list].sort((a, b) => compareTasks(key, now)({ ...a, completed: false }, { ...b, completed: false }));
    const pastDue = (t: Task) => !!t.dueDate && dayDiff(new Date(t.dueDate), now) < 0;
    const overdue = stable([...d.overdue, ...keep.filter(pastDue)], "due");
    const today = stable([...d.dueToday, ...keep.filter((t) => isDueToday(t, now))], "smart");
    const priority = stable(
      [
        ...d.priority,
        ...keep.filter(
          (t) => (t.priority === "urgent" || t.priority === "high") && !pastDue(t) && !isDueToday(t, now),
        ),
      ],
      "priority",
    ).slice(0, 4);
    return {
      focusSections: [
        { id: "overdue", title: "Overdue", tasks: overdue, tone: "danger" as const },
        { id: "today", title: "Due today", tasks: today },
      ].filter((s) => s.tasks.length) as Section[],
      prioritySection: priority.length
        ? ([{ id: "priority", title: "High priority, no rush yet", tasks: priority }] as Section[])
        : [],
    };
  }, [d, tasks, lingering, now]);

  const pct = d.planTotal ? d.planDone / d.planTotal : 0;
  const first = name ? `, ${name.split(" ")[0]}` : "";
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const summary =
    d.overdue.length + d.dueToday.length === 0
      ? "Nothing urgent is waiting. A good moment to get ahead."
      : [
          d.dueToday.length ? `${pluralize(d.dueToday.length, "task")} due today` : null,
          d.overdue.length ? `${d.overdue.length} overdue` : null,
        ]
          .filter(Boolean)
          .join(" and ") + ".";

  return (
    <div className="@container">
      <motion.header {...fade(0)} className="mb-7 pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-faint">{dateLabel}</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-fg sm:text-[34px]">
          {greeting(now)}
          {first}.
        </h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          Here&apos;s what needs your attention. <span className="text-fg-faint">{summary}</span>
        </p>
      </motion.header>

      {isDemo && (
        <motion.div
          {...fade(1)}
          className="mb-5 flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-[12.5px] text-fg-muted"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1">You&apos;re exploring Suru with sample tasks.</span>
          <button
            type="button"
            onClick={() => openDialog("confirm-reset")}
            className="shrink-0 font-medium text-fg underline-offset-4 hover:underline"
          >
            Clear sample data
          </button>
        </motion.div>
      )}

      <motion.div {...fade(2)}>
        <CommandBar now={now} autoFocus />
      </motion.div>

      {/* Summary */}
      <motion.section {...fade(3)} aria-label="Summary" className="mt-7 grid grid-cols-3 gap-2.5 @2xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="col-span-3 flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 @2xl:col-span-1">
          <ProgressRing value={pct} />
          <div className="min-w-0">
            <p className="text-[12px] text-fg-faint">Today&apos;s progress</p>
            <p className="mt-0.5 text-[22px] font-semibold tracking-tight text-fg">
              {d.planDone}
              <span className="text-fg-faint"> / {d.planTotal}</span>
            </p>
            <p className="text-[12px] text-fg-muted">
              {d.planTotal === 0
                ? "No tasks planned for today"
                : d.planDone === d.planTotal
                  ? "Everything done. Beautiful."
                  : `${d.planTotal - d.planDone} to go — keep the momentum`}
            </p>
          </div>
        </div>
        <Stat
          icon={<AlarmClock className="h-3.5 w-3.5" />}
          label="Overdue"
          value={d.overdue.length}
          tone={d.overdue.length ? "danger" : undefined}
          onClick={() => setView("today")}
        />
        <Stat icon={<Sun className="h-3.5 w-3.5" />} label="Due today" value={d.dueToday.length} onClick={() => setView("today")} />
        <Stat
          icon={<CalendarRange className="h-3.5 w-3.5" />}
          label="Next 7 days"
          value={d.upcoming.length}
          onClick={() => setView("upcoming")}
        />
      </motion.section>

      <div className="mt-8 grid gap-8 @3xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Focus */}
        <motion.section {...fade(4)} aria-labelledby="focus-heading" className="min-w-0">
          <SectionHeading id="focus-heading" title="Focus" action={{ label: "Open Today", onClick: () => setView("today") }} />
          {focusSections.length ? (
            <TaskList sections={focusSections} now={now} compact />
          ) : (
            <div className="rounded-2xl border border-line bg-surface/60">
              <EmptyState
                icon={<Coffee className="h-5 w-5" />}
                title="You’re all caught up."
                body="Nothing is waiting for you right now. Plan something meaningful, or enjoy the space."
                action={
                  <Button size="sm" variant="outline" onClick={() => askAi("What should I focus on today?")}>
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Plan my day
                  </Button>
                }
              />
            </div>
          )}
          {prioritySection.length > 0 && <TaskList sections={prioritySection} now={now} compact className="mt-6" />}
        </motion.section>

        {/* Side column */}
        <motion.aside {...fade(5)} className="min-w-0 space-y-8">
          <button
            type="button"
            onClick={() => askAi("What should I focus on today?")}
            className="group relative w-full overflow-hidden rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]"
              aria-hidden
            />
            <span className="flex items-center gap-2 text-[12px] font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Suru AI
            </span>
            <p className="mt-2 text-[14px] font-medium leading-snug text-fg">Not sure where to start?</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">Get a focused plan built from your actual tasks.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-fg-muted transition-colors group-hover:text-fg">
              Plan my day <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>

          <div>
            <SectionHeading title="Coming up" action={{ label: "All", onClick: () => setView("upcoming") }} />
            {d.upcoming.length ? (
              <TaskList sections={[{ id: "up", title: "", tasks: d.upcoming.slice(0, 4) }]} now={now} compact hideWorkspace />
            ) : (
              <p className="rounded-2xl border border-line px-4 py-5 text-[12.5px] text-fg-faint">A clear week ahead.</p>
            )}
          </div>

          <div>
            <SectionHeading title="Recently completed" action={{ label: "All", onClick: () => setView("completed") }} />
            {d.recentlyCompleted.length ? (
              <TaskList
                sections={[{ id: "done", title: "", tasks: d.recentlyCompleted }]}
                now={now}
                compact
                hideWorkspace
                showCompletedTime
              />
            ) : (
              <p className="flex items-center gap-2 rounded-2xl border border-line px-4 py-5 text-[12.5px] text-fg-faint">
                <CheckCircle2 className="h-3.5 w-3.5" /> Finished tasks will show up here.
              </p>
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  action,
}: {
  id?: string;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 id={id} className="text-[13px] font-semibold tracking-tight text-fg">
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-1 rounded text-[12px] text-fg-faint transition-colors hover:text-fg"
        >
          {action.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2 @2xl:p-4"
    >
      <span className={cn("flex items-center gap-1.5 text-[12px]", tone === "danger" ? "text-danger" : "text-fg-faint")}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "mt-3 text-[24px] font-semibold leading-none tracking-tight tabular-nums",
          tone === "danger" ? "text-danger" : "text-fg",
        )}
      >
        {value}
      </span>
    </button>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[64px] w-[64px] shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" role="img" aria-label={`${Math.round(value * 100)}% of today's tasks completed`}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value), opacity: value > 0 ? 1 : 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[12px] font-medium text-fg">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

