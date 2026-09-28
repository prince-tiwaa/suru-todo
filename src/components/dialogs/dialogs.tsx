"use client";

import { useState } from "react";
import { Download, Monitor, Moon, RotateCcw, Sparkles, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ThemePreference } from "@/lib/types";
import { useTasks } from "@/lib/store/tasks";
import { useSettings } from "@/lib/store/settings";
import { useUi } from "@/lib/store/ui";
import { useAiStatus } from "@/hooks/use-misc";
import { isMac, pluralize } from "@/lib/utils";
import { Dialog } from "../ui/dialog";
import { Button, Kbd } from "../ui/button";
import { Logo, Segmented } from "../ui/misc";
import { Avatar } from "../layout/sidebar";

/* ------------------------------ Settings ------------------------------ */

export function SettingsDialog() {
  const open = useUi((s) => s.dialog === "settings");
  const openDialog = useUi((s) => s.openDialog);
  const { name, setName, theme, setTheme } = useSettings();
  const tasks = useTasks((s) => s.tasks);
  const loadDemo = useTasks((s) => s.loadDemo);
  const status = useAiStatus();

  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), tasks }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suru-tasks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported your tasks");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && openDialog(null)} title="Settings" description="Personalise Suru and manage your data.">
      <div className="space-y-7">
        <Group title="Profile">
          <div className="flex items-center gap-3">
            <Avatar name={name} className="h-10 w-10 text-[13px]" />
            <div className="min-w-0 flex-1">
              <label htmlFor="settings-name" className="text-[12px] text-fg-faint">
                Display name
              </label>
              <input
                id="settings-name"
                defaultValue={name}
                onBlur={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="What should Suru call you?"
                className="mt-1 h-9 w-full rounded-lg border border-line bg-bg-subtle px-3 text-[13.5px] text-fg outline-none focus:border-line-strong"
              />
            </div>
          </div>
        </Group>

        <Group title="Appearance">
          <Segmented<ThemePreference>
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark", label: <><Moon className="h-3.5 w-3.5" /> Dark</> },
              { value: "light", label: <><Sun className="h-3.5 w-3.5" /> Light</> },
              { value: "system", label: <><Monitor className="h-3.5 w-3.5" /> System</> },
            ]}
          />
        </Group>

        <Group title="Suru AI">
          <div className="rounded-xl border border-line bg-surface-2/50 p-3.5 text-[13px]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium text-fg">
                {status?.mode === "live" ? "Connected" : "Demo mode"}
              </span>
              {status?.mode === "live" && (
                <span className="font-mono text-[11px] text-fg-faint">
                  {status.provider} · {status.model}
                </span>
              )}
            </div>
            <p className="mt-1.5 leading-relaxed text-fg-muted">
              {status?.mode === "live"
                ? "AI features use your configured model. Only a compact summary of your tasks is sent with assistant requests."
                : "No API key is configured, so Suru uses its built-in rules engine. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to the server environment to enable a live model."}
            </p>
          </div>
        </Group>

        <Group title="Data">
          <p className="mb-3 text-[12.5px] text-fg-muted">
            {pluralize(tasks.length, "task")} stored in this browser. Nothing leaves your device except AI requests.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportJson} disabled={!tasks.length}>
              <Download className="h-3.5 w-3.5" /> Export JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadDemo();
                toast.success("Sample tasks loaded");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Load sample tasks
            </Button>
            <Button size="sm" variant="danger" onClick={() => openDialog("confirm-reset")} disabled={!tasks.length}>
              <Trash2 className="h-3.5 w-3.5" /> Delete all tasks
            </Button>
          </div>
        </Group>

        <button
          type="button"
          onClick={() => openDialog("shortcuts")}
          className="flex w-full items-center justify-between rounded-lg text-[12.5px] text-fg-faint transition-colors hover:text-fg"
        >
          Keyboard shortcuts
          <Kbd>?</Kbd>
        </button>
      </div>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">{title}</h3>
      {children}
    </section>
  );
}

/* ------------------------------ Shortcuts ----------------------------- */

export function ShortcutsDialog() {
  const open = useUi((s) => s.dialog === "shortcuts");
  const openDialog = useUi((s) => s.openDialog);
  const mod = isMac() ? "⌘" : "Ctrl";
  const groups: [string, [string[], string][]][] = [
    [
      "General",
      [
        [[mod, "K"], "New task"],
        [["N"], "New task"],
        [["/"], "Search / new task"],
        [[mod, "J"], "Toggle Suru AI"],
        [["?"], "Show shortcuts"],
      ],
    ],
    [
      "Navigate",
      [
        [["G", "H"], "Home"],
        [["G", "I"], "Inbox"],
        [["G", "T"], "Today"],
        [["G", "U"], "Upcoming"],
        [["G", "C"], "Completed"],
      ],
    ],
    [
      "Focused task",
      [
        [["↑", "↓"], "Move between tasks"],
        [["X"], "Complete / undo"],
        [["E"], "Edit"],
        [["⌫"], "Delete"],
      ],
    ],
    [
      "Command bar",
      [
        [["↵"], "Add task"],
        [[mod, "↵"], "Add with AI parsing"],
        [["Esc"], "Clear"],
      ],
    ],
  ];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && openDialog(null)} title="Keyboard shortcuts" size="md">
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map(([title, items]) => (
          <section key={title}>
            <h3 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">{title}</h3>
            <ul className="space-y-1.5">
              {items.map(([keys, label]) => (
                <li key={label + keys.join()} className="flex items-center justify-between gap-3 text-[13px] text-fg-muted">
                  {label}
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

/* ------------------------------ Confirms ------------------------------ */

export function ConfirmDialogs() {
  const dialog = useUi((s) => s.dialog);
  const openDialog = useUi((s) => s.openDialog);
  const clearAll = useTasks((s) => s.clearAll);
  const clearCompleted = useTasks((s) => s.clearCompleted);
  const tasks = useTasks((s) => s.tasks);
  const isDemo = useTasks((s) => s.isDemo);
  const completed = tasks.filter((t) => t.completed).length;
  const close = () => openDialog(null);

  return (
    <>
      <Dialog
        open={dialog === "confirm-reset"}
        onOpenChange={(o) => !o && close()}
        title={isDemo ? "Clear sample data?" : "Delete all tasks?"}
        description={
          isDemo
            ? "This removes every sample task so you can start with a clean slate. You can load them again from Settings."
            : `This permanently deletes ${pluralize(tasks.length, "task")} from this browser. This can't be undone.`
        }
        size="sm"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={close} className="ml-auto">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                clearAll();
                close();
                toast.success(isDemo ? "Sample data cleared — it's all yours now" : "All tasks deleted");
              }}
            >
              {isDemo ? "Clear sample data" : "Delete everything"}
            </Button>
          </>
        }
      >
        {null}
      </Dialog>

      <Dialog
        open={dialog === "confirm-clear-completed"}
        onOpenChange={(o) => !o && close()}
        title="Clear completed tasks?"
        description={`${pluralize(completed, "completed task")} will be removed.`}
        size="sm"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={close} className="ml-auto">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                const removed = clearCompleted();
                close();
                toast(`Cleared ${pluralize(removed.length, "task")}`, {
                  action: { label: "Undo", onClick: () => removed.forEach((t) => useTasks.getState().restoreTask(t)) },
                });
              }}
            >
              Clear completed
            </Button>
          </>
        }
      >
        {null}
      </Dialog>
    </>
  );
}

/* ------------------------------ Welcome ------------------------------- */

export function WelcomeDialog() {
  const onboarded = useSettings((s) => s.onboarded);
  const complete = useSettings((s) => s.completeOnboarding);
  const setName = useSettings((s) => s.setName);
  const clearAll = useTasks((s) => s.clearAll);
  const [name, setLocalName] = useState("");

  function finish(fresh: boolean) {
    setName(name);
    if (fresh) clearAll();
    complete();
    // Hand focus straight to the command bar once the dialog has closed.
    if (window.matchMedia("(hover: hover)").matches) setTimeout(() => useUi.getState().focusCommandBar(), 260);
  }

  return (
    <Dialog
      open={!onboarded}
      onOpenChange={(o) => !o && finish(false)}
      title="Welcome to Suru"
      hideHeader
      size="sm"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          finish(false);
        }}
        className="pt-2"
      >
        <Logo withWord={false} />
        <h2 className="mt-5 text-[22px] font-semibold leading-tight tracking-tight text-fg">Turn intentions into momentum.</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
          Suru is a calm task manager with an assistant that turns vague plans into clear next steps.
        </p>
        <label htmlFor="welcome-name" className="mt-6 block text-[12px] text-fg-faint">
          What should we call you?
        </label>
        <input
          id="welcome-name"
          value={name}
          onChange={(e) => setLocalName(e.target.value)}
          placeholder="Your first name"
          autoComplete="given-name"
          className="mt-1.5 h-10 w-full rounded-lg border border-line bg-bg-subtle px-3 text-[14px] text-fg outline-none focus:border-line-strong"
        />
        <div className="mt-6 flex flex-col gap-2">
          <Button type="submit" variant="primary" className="h-10">
            Explore with sample tasks
          </Button>
          <Button variant="ghost" onClick={() => finish(true)}>
            Start with a clean slate
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
