import type { ListFilters, SortKey, Task, TaskContext, ViewId, WorkspaceId } from "./types";
import { PRIORITY_RANK, WORKSPACE_META } from "./constants";
import { dayDiff, dueState, isSameDay } from "./dates";

const time = (iso?: string) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);

export const isOverdue = (t: Task, now = new Date()) =>
  !t.completed && dueState(t.dueDate, t.hasTime, now) === "overdue";
export const isDueToday = (t: Task, now = new Date()) =>
  !!t.dueDate && isSameDay(new Date(t.dueDate), now);
export const isUpcoming = (t: Task, now = new Date()) =>
  !t.completed && !!t.dueDate && dayDiff(new Date(t.dueDate), now) > 0;

export function compareTasks(sort: SortKey, now = new Date()) {
  return (a: Task, b: Task): number => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    switch (sort) {
      case "due":
        return time(a.dueDate) - time(b.dueDate) || PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      case "priority":
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || time(a.dueDate) - time(b.dueDate);
      case "created":
        return time(b.createdAt) - time(a.createdAt);
      case "title":
        return a.title.localeCompare(b.title);
      case "smart":
      default: {
        if (a.completed && b.completed) return time(b.completedAt) - time(a.completedAt);
        const ao = isOverdue(a, now) ? 0 : 1;
        const bo = isOverdue(b, now) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        // Same-day tasks rank by priority before exact time
        const ad = a.dueDate ? dayDiff(new Date(a.dueDate), now) : Number.POSITIVE_INFINITY;
        const bd = b.dueDate ? dayDiff(new Date(b.dueDate), now) : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return (
          PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
          time(a.dueDate) - time(b.dueDate) ||
          time(b.createdAt) - time(a.createdAt)
        );
      }
    }
  };
}

export function applyFilters(tasks: Task[], f: ListFilters, keep: string[] = []): Task[] {
  const q = f.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.status === "active" && t.completed && !keep.includes(t.id)) return false;
    if (f.status === "completed" && !t.completed) return false;
    if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
    if (f.tag && !t.tags.includes(f.tag)) return false;
    if (q) {
      const hay = `${t.title} ${t.notes ?? ""} ${t.tags.join(" ")} ${WORKSPACE_META[t.workspace].label}`.toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

export interface Section {
  id: string;
  title: string;
  tasks: Task[];
  tone?: "danger" | "default";
}

/** Returns the tasks belonging to a view, before user filters. */
export function tasksForView(tasks: Task[], view: ViewId, now = new Date()): Task[] {
  switch (view) {
    case "today":
      return tasks.filter(
        (t) =>
          (t.dueDate && (isDueToday(t, now) || isOverdue(t, now))) ||
          (t.completed && t.completedAt && isSameDay(new Date(t.completedAt), now) && isDueToday(t, now)),
      );
    case "upcoming":
      return tasks.filter((t) => !!t.dueDate && dayDiff(new Date(t.dueDate), now) > 0);
    case "completed":
      return tasks.filter((t) => t.completed);
    case "inbox":
    case "home":
      return tasks;
    default: {
      const ws = view.replace("workspace:", "") as WorkspaceId;
      return tasks.filter((t) => t.workspace === ws);
    }
  }
}

export function sectionsForView(tasks: Task[], view: ViewId, sort: SortKey, now = new Date()): Section[] {
  const sorted = [...tasks].sort(compareTasks(sort, now));

  if (view === "today") {
    const overdue = sorted.filter((t) => isOverdue(t, now) && !isDueToday(t, now));
    const today = sorted.filter((t) => !overdue.includes(t));
    return [
      { id: "overdue", title: "Overdue", tasks: overdue, tone: "danger" as const },
      { id: "today", title: "Today", tasks: today },
    ].filter((s) => s.tasks.length);
  }

  if (view === "upcoming" && sort === "smart") {
    const groups = new Map<string, Section>();
    for (const t of [...sorted].sort((a, b) => time(a.dueDate) - time(b.dueDate))) {
      const d = new Date(t.dueDate!);
      const diff = dayDiff(d, now);
      let id: string;
      let title: string;
      if (diff === 1) {
        id = "tomorrow";
        title = "Tomorrow";
      } else if (diff < 7) {
        id = `d${diff}`;
        title = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
      } else if (diff < 14) {
        id = "next-week";
        title = "Next week";
      } else {
        id = "later";
        title = "Later";
      }
      if (!groups.has(id)) groups.set(id, { id, title, tasks: [] });
      groups.get(id)!.tasks.push(t);
    }
    return [...groups.values()];
  }

  if (view === "completed") {
    const byCompleted = [...tasks].sort((a, b) => time(b.completedAt) - time(a.completedAt));
    const today: Task[] = [];
    const week: Task[] = [];
    const earlier: Task[] = [];
    for (const t of byCompleted) {
      const diff = t.completedAt ? dayDiff(now, new Date(t.completedAt)) : 99;
      (diff === 0 ? today : diff < 7 ? week : earlier).push(t);
    }
    const src = sort === "smart" ? null : sorted;
    if (src) return [{ id: "all", title: "Completed", tasks: src }];
    return [
      { id: "today", title: "Today", tasks: today },
      { id: "week", title: "Earlier this week", tasks: week },
      { id: "earlier", title: "Earlier", tasks: earlier },
    ].filter((s) => s.tasks.length);
  }

  return [{ id: "all", title: "", tasks: sorted }];
}

export function collectTags(tasks: Task[]): string[] {
  const counts = new Map<string, number>();
  tasks.forEach((t) => t.tags.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function viewCounts(tasks: Task[], now = new Date()) {
  const active = tasks.filter((t) => !t.completed);
  return {
    inbox: active.length,
    today: active.filter((t) => isDueToday(t, now) || isOverdue(t, now)).length,
    upcoming: active.filter((t) => isUpcoming(t, now)).length,
    completed: tasks.length - active.length,
    personal: active.filter((t) => t.workspace === "personal").length,
    work: active.filter((t) => t.workspace === "work").length,
    projects: active.filter((t) => t.workspace === "projects").length,
    overdue: active.filter((t) => isOverdue(t, now)).length,
  };
}

export function dashboardData(tasks: Task[], now = new Date()) {
  const active = tasks.filter((t) => !t.completed);
  const overdue = active.filter((t) => isOverdue(t, now) && !isDueToday(t, now)).sort(compareTasks("due", now));
  const dueToday = active.filter((t) => isDueToday(t, now)).sort(compareTasks("smart", now));
  const upcoming = active
    .filter((t) => isUpcoming(t, now) && dayDiff(new Date(t.dueDate!), now) <= 7)
    .sort(compareTasks("due", now));
  const priority = active
    .filter((t) => (t.priority === "urgent" || t.priority === "high") && !dueToday.includes(t) && !overdue.includes(t))
    .sort(compareTasks("priority", now));
  const completedToday = tasks.filter((t) => t.completed && t.completedAt && isSameDay(new Date(t.completedAt), now));
  const recentlyCompleted = tasks
    .filter((t) => t.completed)
    .sort((a, b) => time(b.completedAt) - time(a.completedAt))
    .slice(0, 4);

  // Today's plan = everything due today (done or not) + overdue + anything finished today.
  const planIds = new Set([...dueToday, ...overdue, ...completedToday].map((t) => t.id));
  tasks.filter((t) => t.completed && isDueToday(t, now)).forEach((t) => planIds.add(t.id));
  const planTotal = planIds.size;
  const planDone = tasks.filter((t) => planIds.has(t.id) && t.completed).length;

  return { overdue, dueToday, upcoming, priority, completedToday, recentlyCompleted, planTotal, planDone };
}

export function toContext(tasks: Task[]): TaskContext[] {
  // Send the most relevant 80 tasks: all active, then most recent completed.
  const active = tasks.filter((t) => !t.completed);
  const done = tasks
    .filter((t) => t.completed)
    .sort((a, b) => time(b.completedAt) - time(a.completedAt))
    .slice(0, 15);
  return [...active, ...done].slice(0, 80).map((t) => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    priority: t.priority,
    workspace: t.workspace,
    dueDate: t.dueDate,
    hasTime: t.hasTime,
    tags: t.tags,
    completedAt: t.completedAt,
  }));
}
