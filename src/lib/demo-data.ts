import type { Task, TaskDraft } from "./types";
import { addDays, dateOnly } from "./dates";
import { uid } from "./utils";

/**
 * Realistic sample tasks, positioned relative to "now" so the dashboard
 * always has something due today, something overdue and something upcoming.
 */
export function createDemoTasks(now = new Date()): Task[] {
  const at = (days: number, hour?: number, minute = 0) => {
    const d = addDays(now, days);
    if (hour === undefined) return { dueDate: dateOnly(d), hasTime: false };
    return {
      dueDate: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).toISOString(),
      hasTime: true,
    };
  };
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

  const drafts: (TaskDraft & { completed?: boolean; completedHoursAgo?: number; createdHoursAgo: number })[] = [
    { title: "Finalise project documentation", priority: "high", workspace: "work", tags: ["docs"], ...at(0), createdHoursAgo: 50, notes: "Cover setup, environment variables and the deployment checklist." },
    { title: "Review graduate application requirements", priority: "urgent", workspace: "personal", tags: ["grad-school"], ...at(-1), createdHoursAgo: 120 },
    { title: "Complete API integration for payments service", priority: "urgent", workspace: "projects", tags: ["backend"], ...at(0, 17), createdHoursAgo: 72, notes: "Webhook signature verification still pending." },
    { title: "Prepare presentation slides for Thursday demo", priority: "medium", workspace: "work", tags: ["demo"], ...at(2), createdHoursAgo: 30 },
    { title: "Submit weekly report", priority: "high", workspace: "work", tags: ["reporting"], ...at(-2), createdHoursAgo: 96 },
    { title: "Book dentist appointment", priority: "low", workspace: "personal", tags: [], ...at(4), createdHoursAgo: 20 },
    { title: "Draft statement of purpose — first pass", priority: "high", workspace: "personal", tags: ["grad-school"], ...at(5), createdHoursAgo: 40 },
    { title: "Refactor authentication middleware", priority: "medium", workspace: "projects", tags: ["backend"], ...at(9), createdHoursAgo: 60 },
    { title: "Plan weekend grocery run", priority: "none", workspace: "personal", tags: ["home"], createdHoursAgo: 8 },
    { title: "Read 'Designing Data-Intensive Applications' ch. 5", priority: "low", workspace: "personal", tags: ["learning"], createdHoursAgo: 200 },
    { title: "Reply to recruiter about interview slots", priority: "high", workspace: "work", tags: [], ...at(0, 11), createdHoursAgo: 26, completed: true, completedHoursAgo: 2 },
    { title: "Set up CI pipeline for staging", priority: "medium", workspace: "projects", tags: ["devops"], ...at(-1), createdHoursAgo: 90, completed: true, completedHoursAgo: 5 },
    { title: "Pay electricity bill", priority: "medium", workspace: "personal", tags: ["home"], ...at(0), createdHoursAgo: 48, completed: true, completedHoursAgo: 1 },
    { title: "Sketch onboarding flow wireframes", priority: "low", workspace: "projects", tags: ["design"], createdHoursAgo: 150, completed: true, completedHoursAgo: 30 },
  ];

  return drafts.map((d) => {
    const createdAt = ago(d.createdHoursAgo);
    const completedAt = d.completed ? ago(d.completedHoursAgo ?? 1) : undefined;
    return {
      id: uid(),
      title: d.title,
      notes: d.notes,
      completed: !!d.completed,
      completedAt,
      createdAt,
      updatedAt: completedAt ?? createdAt,
      dueDate: d.dueDate,
      hasTime: d.hasTime,
      priority: d.priority ?? "none",
      workspace: d.workspace ?? "personal",
      tags: d.tags ?? [],
      source: "manual",
    };
  });
}
