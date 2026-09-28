/**
 * Date helpers. All comparisons are done in the user's local time zone.
 * Kept dependency-free on purpose — the app only needs a handful of operations.
 */

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dayDiff = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

export type DueState = "overdue" | "today" | "tomorrow" | "soon" | "later" | "none";

export function dueState(iso: string | undefined, hasTime: boolean | undefined, now = new Date()): DueState {
  if (!iso) return "none";
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "none";
  const diff = dayDiff(due, now);
  if (diff < 0) return "overdue";
  if (diff === 0) return hasTime && due.getTime() < now.getTime() ? "overdue" : "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "soon";
  return "later";
}

const timeFmt = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined });

/** Short human label: "Today 10 AM", "Tomorrow", "Fri", "3 days ago", "Oct 12". */
export function formatDue(iso: string, hasTime?: boolean, now = new Date()): string {
  const due = new Date(iso);
  const diff = dayDiff(due, now);
  const t = hasTime ? ` · ${timeFmt(due)}` : "";
  if (diff === 0) return `Today${t}`;
  if (diff === 1) return `Tomorrow${t}`;
  if (diff === -1) return `Yesterday${t}`;
  if (diff < -1 && diff >= -6) return `${-diff} days ago`;
  if (diff > 1 && diff < 7) return `${due.toLocaleDateString(undefined, { weekday: "short" })}${t}`;
  const sameYear = due.getFullYear() === now.getFullYear();
  return `${due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  })}${t}`;
}

export function formatLong(iso: string, hasTime?: boolean) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function relativeTime(iso: string, now = new Date()) {
  const s = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** yyyy-mm-dd in local time, for <input type="date"> */
export function toDateInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toTimeInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Combine date + optional time inputs into an ISO string (local time). */
export function fromInputs(date: string, time?: string): { dueDate?: string; hasTime: boolean } {
  if (!date) return { dueDate: undefined, hasTime: false };
  const [y, m, d] = date.split("-").map(Number);
  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    return { dueDate: new Date(y, m - 1, d, hh, mm).toISOString(), hasTime: true };
  }
  return { dueDate: new Date(y, m - 1, d, 12, 0).toISOString(), hasTime: false };
}

/** Anchor a date-only due date at local noon to avoid timezone edge flips. */
export function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0).toISOString();
}

export function quickDates(now = new Date()) {
  const dow = now.getDay();
  const toSat = (6 - dow + 7) % 7 || 7;
  const toMon = (8 - dow) % 7 || 7;
  return [
    { id: "today", label: "Today", date: dateOnly(now) },
    { id: "tomorrow", label: "Tomorrow", date: dateOnly(addDays(now, 1)) },
    { id: "weekend", label: "This weekend", date: dateOnly(addDays(now, toSat)) },
    { id: "nextweek", label: "Next week", date: dateOnly(addDays(now, toMon)) },
  ];
}
