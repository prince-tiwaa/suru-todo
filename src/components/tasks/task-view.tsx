"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { CalendarRange, CheckCircle2, Inbox, SearchX, Sparkles, Sun, Trash2 } from "lucide-react";
import type { ViewId, WorkspaceId } from "@/lib/types";
import { WORKSPACE_META } from "@/lib/constants";
import { useTasks } from "@/lib/store/tasks";
import { useUi } from "@/lib/store/ui";
import { applyFilters, collectTags, sectionsForView, tasksForView } from "@/lib/selectors";
import { pluralize } from "@/lib/utils";
import { Button } from "../ui/button";
import { EmptyState, WorkspaceDot } from "../ui/misc";
import { CommandBar } from "./command-bar";
import { ListToolbar } from "./list-toolbar";
import { TaskList } from "./task-list";

const META: Record<string, { title: string; subtitle: string }> = {
  inbox: { title: "Inbox", subtitle: "Everything on your plate, in one place." },
  today: { title: "Today", subtitle: "What deserves your energy right now." },
  upcoming: { title: "Upcoming", subtitle: "What's on the horizon." },
  completed: { title: "Completed", subtitle: "Proof of momentum." },
};

export function TaskView({ view, now }: { view: ViewId; now: Date }) {
  const tasks = useTasks((s) => s.tasks);
  const filters = useUi((s) => s.filters);
  const lingering = useUi((s) => s.lingering);
  const resetFilters = useUi((s) => s.resetFilters);
  const askAi = useUi((s) => s.askAi);
  const openDialog = useUi((s) => s.openDialog);
  const focusCommandBar = useUi((s) => s.focusCommandBar);

  const workspace = view.startsWith("workspace:") ? (view.split(":")[1] as WorkspaceId) : null;
  const meta = workspace
    ? { title: WORKSPACE_META[workspace].label, subtitle: `Everything in your ${WORKSPACE_META[workspace].label.toLowerCase()} workspace.` }
    : META[view];

  const base = useMemo(() => tasksForView(tasks, view, now), [tasks, view, now]);
  const filtered = useMemo(() => applyFilters(base, filters, lingering), [base, filters, lingering]);
  const sections = useMemo(
    () => sectionsForView(filtered, view, filters.sort, now).filter((s) => s.tasks.length > 0),
    [filtered, view, filters.sort, now],
  );
  const tags = useMemo(() => collectTags(base), [base]);
  const activeCount = base.filter((t) => !t.completed).length;
  const isFiltering = !!filters.query || filters.priorities.length > 0 || !!filters.tag;
  const completedCount = base.filter((t) => t.completed).length;

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex items-end justify-between gap-4 pt-2"
      >
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[26px] font-semibold tracking-[-0.02em] text-fg">
            {workspace && <WorkspaceDot id={workspace} className="h-2.5 w-2.5" />}
            {meta.title}
          </h1>
          <p className="mt-1 text-[14px] text-fg-muted">
            {meta.subtitle}{" "}
            <span className="text-fg-faint">
              {view === "completed" ? pluralize(completedCount, "task") + " done" : pluralize(activeCount, "open task")}
            </span>
          </p>
        </div>
        {view === "completed" && completedCount > 0 && (
          <Button size="sm" variant="ghost" onClick={() => openDialog("confirm-clear-completed")} className="hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" /> <span className="max-sm:hidden">Clear completed</span>
          </Button>
        )}
      </motion.header>

      {view !== "completed" && (
        <div className="mb-6">
          <CommandBar now={now} defaultWorkspace={workspace ?? "personal"} defaultDue={view === "today" ? "today" : view === "upcoming" ? "tomorrow" : undefined} />
        </div>
      )}

      <div className="mb-4">
        <ListToolbar tags={tags} showStatus={view === "inbox" || !!workspace} />
      </div>

      {sections.length > 0 ? (
        <TaskList sections={sections} now={now} hideWorkspace={!!workspace} showCompletedTime={view === "completed"} />
      ) : isFiltering ? (
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="No matches"
          body="Nothing fits those filters. Try a different search, or clear the filters to see everything."
          action={
            <Button size="sm" variant="outline" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ViewEmpty view={view} onAdd={focusCommandBar} onPlan={() => askAi("What should I focus on today?")} />
      )}
    </div>
  );
}

function ViewEmpty({ view, onAdd, onPlan }: { view: ViewId; onAdd: () => void; onPlan: () => void }) {
  if (view === "today")
    return (
      <EmptyState
        icon={<Sun className="h-5 w-5" />}
        title="You’re all caught up."
        body="Nothing is due today. Pull something forward, or enjoy the breathing room."
        action={
          <Button size="sm" variant="outline" onClick={onPlan}>
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Ask Suru what&apos;s next
          </Button>
        }
      />
    );
  if (view === "upcoming")
    return (
      <EmptyState
        icon={<CalendarRange className="h-5 w-5" />}
        title="A clear horizon."
        body="No scheduled tasks ahead. Add a date to anything to see it here — try typing “next Tuesday”."
        action={
          <Button size="sm" variant="outline" onClick={onAdd}>
            Schedule something
          </Button>
        }
      />
    );
  if (view === "completed")
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Your wins will live here."
        body="Complete a task and it lands here — a quiet record of everything you’ve moved forward."
      />
    );
  return (
    <EmptyState
      icon={<Inbox className="h-5 w-5" />}
      title="A blank page."
      body="Nothing is waiting here. Capture the first thing on your mind — Suru will help shape it."
      action={
        <Button size="sm" variant="primary" onClick={onAdd}>
          Add a task
        </Button>
      }
    />
  );
}
