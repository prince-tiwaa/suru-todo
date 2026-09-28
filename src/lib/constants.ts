import type { Priority, WorkspaceId } from "./types";

export const PRIORITIES: { id: Priority; label: string; short: string; rank: number }[] = [
  { id: "urgent", label: "Urgent", short: "P1", rank: 4 },
  { id: "high", label: "High", short: "P2", rank: 3 },
  { id: "medium", label: "Medium", short: "P3", rank: 2 },
  { id: "low", label: "Low", short: "P4", rank: 1 },
  { id: "none", label: "No priority", short: "—", rank: 0 },
];

export const PRIORITY_RANK: Record<Priority, number> = Object.fromEntries(
  PRIORITIES.map((p) => [p.id, p.rank]),
) as Record<Priority, number>;

export const PRIORITY_LABEL: Record<Priority, string> = Object.fromEntries(
  PRIORITIES.map((p) => [p.id, p.label]),
) as Record<Priority, string>;

/** CSS variable holding each priority's colour. */
export const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: "var(--p-urgent)",
  high: "var(--p-high)",
  medium: "var(--p-medium)",
  low: "var(--p-low)",
  none: "var(--fg-faint)",
};

export const WORKSPACES: { id: WorkspaceId; label: string; color: string }[] = [
  { id: "personal", label: "Personal", color: "var(--ws-personal)" },
  { id: "work", label: "Work", color: "var(--ws-work)" },
  { id: "projects", label: "Projects", color: "var(--ws-projects)" },
];

export const WORKSPACE_META = Object.fromEntries(WORKSPACES.map((w) => [w.id, w])) as Record<
  WorkspaceId,
  (typeof WORKSPACES)[number]
>;

export const isPriority = (v: unknown): v is Priority =>
  typeof v === "string" && PRIORITIES.some((p) => p.id === v);

export const isWorkspace = (v: unknown): v is WorkspaceId =>
  typeof v === "string" && WORKSPACES.some((w) => w.id === v);
