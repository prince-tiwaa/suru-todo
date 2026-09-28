"use client";

import { motion } from "motion/react";
import { CalendarRange, CheckCircle2, Home, Inbox, Plus, Settings, Sparkles, Sun } from "lucide-react";
import type { ViewId } from "@/lib/types";
import { WORKSPACES } from "@/lib/constants";
import { useTasks } from "@/lib/store/tasks";
import { useSettings } from "@/lib/store/settings";
import { useUi } from "@/lib/store/ui";
import { viewCounts } from "@/lib/selectors";
import { cn, isMac } from "@/lib/utils";
import { Kbd } from "../ui/button";
import { Logo, WorkspaceDot } from "../ui/misc";

export const NAV: { id: ViewId; label: string; icon: typeof Home; countKey?: keyof ReturnType<typeof viewCounts> }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
  { id: "today", label: "Today", icon: Sun, countKey: "today" },
  { id: "upcoming", label: "Upcoming", icon: CalendarRange, countKey: "upcoming" },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export function SidebarContent({ now, layoutGroup = "sidebar" }: { now: Date; layoutGroup?: string }) {
  const tasks = useTasks((s) => s.tasks);
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  const setAiOpen = useUi((s) => s.setAiOpen);
  const aiOpen = useUi((s) => s.aiOpen);
  const focusCommandBar = useUi((s) => s.focusCommandBar);
  const openDialog = useUi((s) => s.openDialog);
  const name = useSettings((s) => s.name);
  const counts = viewCounts(tasks, now);
  const mod = isMac() ? "⌘" : "Ctrl ";

  const item = (id: ViewId, label: React.ReactNode, icon: React.ReactNode, count?: number, tone?: "danger") => {
    const active = view === id;
    return (
      <li key={id}>
        <button
          type="button"
          onClick={() => setView(id)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
            active ? "text-fg" : "text-fg-muted hover:bg-surface-2/70 hover:text-fg",
          )}
        >
          {active && (
            <motion.span
              layoutId={`${layoutGroup}-active`}
              className="absolute inset-0 rounded-lg border border-line bg-surface-2"
              transition={{ type: "spring", stiffness: 550, damping: 42 }}
            />
          )}
          <span className="relative flex w-4 justify-center">{icon}</span>
          <span className="relative flex-1 text-left">{label}</span>
          {count ? (
            <span className={cn("relative font-mono text-[11px] tabular-nums", tone === "danger" ? "text-danger" : "text-fg-faint")}>
              {count}
            </span>
          ) : null}
        </button>
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>

      <div className="space-y-1.5 px-3">
        <button
          type="button"
          onClick={() => {
            if (view === "completed") setView("home");
            requestAnimationFrame(focusCommandBar);
          }}
          className="flex h-8 w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-fg-muted shadow-sm transition-colors hover:border-line-strong hover:text-fg"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">New task</span>
          <Kbd className="[@media(hover:none)]:hidden">{mod}K</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setAiOpen(!aiOpen)}
          aria-pressed={aiOpen}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
            aiOpen ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface-2/70 hover:text-fg",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Ask Suru AI</span>
          <Kbd className="[@media(hover:none)]:hidden">{mod}J</Kbd>
        </button>
      </div>

      <nav aria-label="Primary" className="mt-5 flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {NAV.map((n) =>
            item(
              n.id,
              n.label,
              <n.icon className="h-4 w-4" />,
              n.countKey ? counts[n.countKey] : undefined,
              n.id === "today" && counts.overdue > 0 ? "danger" : undefined,
            ),
          )}
        </ul>

        <p className="mb-1.5 mt-6 px-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">Workspaces</p>
        <ul className="space-y-0.5">
          {WORKSPACES.map((w) => item(`workspace:${w.id}`, w.label, <WorkspaceDot id={w.id} />, counts[w.id]))}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-line p-3">
        <button
          type="button"
          onClick={() => openDialog("settings")}
          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-fg-muted transition-colors hover:bg-surface-2/70 hover:text-fg"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          type="button"
          onClick={() => openDialog("settings")}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2/70"
          aria-label="Profile"
        >
          <Avatar name={name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-fg">{name || "Your profile"}</span>
            <span className="block text-[11px] text-fg-faint">Local workspace</span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "S";
  return (
    <span
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-3 text-[11px] font-semibold text-fg",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
