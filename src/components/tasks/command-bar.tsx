"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Hash, ListTree, Plus, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { Priority, WorkspaceId } from "@/lib/types";
import { parseTaskInput } from "@/lib/nlp/parse-task";
import { ai } from "@/lib/ai/client";
import { useUi } from "@/lib/store/ui";
import { useTaskActions } from "@/hooks/use-task-actions";
import { addDays, dateOnly } from "@/lib/dates";
import { cn, isMac } from "@/lib/utils";
import { Button, Kbd, Spinner } from "../ui/button";
import { Tooltip } from "../ui/menu";
import { DatePicker, PriorityPicker, WorkspacePicker } from "./pickers";

let didAutoFocus = false;

type DuePick = { dueDate?: string; hasTime: boolean };

const EXAMPLES = [
  "Submit scholarship application next Friday at 10am",
  "Call the bank tomorrow 9am !high",
  "Draft project proposal Thursday #writing",
  "Remind me to renew passport in 2 weeks",
];

export function CommandBar({
  now,
  defaultWorkspace = "personal",
  defaultDue,
  autoFocus,
}: {
  now: Date;
  defaultWorkspace?: WorkspaceId;
  /** Date applied when the text doesn't mention one (e.g. Today view → today). */
  defaultDue?: "today" | "tomorrow";
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [due, setDue] = useState<DuePick | undefined>();
  const [priority, setPriority] = useState<Priority | undefined>();
  const [workspacePick, setWorkspace] = useState<WorkspaceId | undefined>();
  const workspace = workspacePick ?? defaultWorkspace;
  const [busy, setBusy] = useState<null | "smart" | "enhance">(null);
  const [enhancedFrom, setEnhancedFrom] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);
  const focusNonce = useUi((s) => s.focusNonce);
  const openBreakdown = useUi((s) => s.openBreakdown);
  const { add } = useTaskActions();

  useEffect(() => {
    if (focusNonce) inputRef.current?.focus();
  }, [focusNonce]);
  useEffect(() => {
    // Only on the first mount of the session — never steal focus on later navigation.
    if (autoFocus && !didAutoFocus && window.matchMedia("(hover: hover)").matches) {
      didAutoFocus = true;
      inputRef.current?.focus();
    }
  }, [autoFocus]);
  useEffect(() => {
    const id = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo(() => parseTaskInput(text, now), [text, now]);

  const effective = {
    title: parsed.title,
    dueDate: due ? due.dueDate : (parsed.dueDate ??
          (defaultDue === "today" ? dateOnly(now) : defaultDue === "tomorrow" ? dateOnly(addDays(now, 1)) : undefined)),
    hasTime: due ? due.hasTime : parsed.hasTime,
    priority: priority ?? parsed.priority ?? "none",
    workspace: parsed.workspace ?? workspace,
    tags: parsed.tags ?? [],
  };
  const dateDetected = !due && !!parsed.dueDate;
  const priorityDetected = !priority && !!parsed.priority;

  function reset() {
    setText("");
    setDue(undefined);
    setPriority(undefined);
    setWorkspace(undefined);
    setEnhancedFrom(null);
  }

  function submit() {
    if (!effective.title) {
      inputRef.current?.focus();
      return;
    }
    add({ ...effective, source: "manual" });
    reset();
  }

  async function smartSubmit() {
    if (!text.trim()) return;
    setBusy("smart");
    const res = await ai.parse(text);
    setBusy(null);
    const d = res.data;
    add({
      title: d.title || effective.title,
      dueDate: due ? due.dueDate : d.dueDate,
      hasTime: due ? due.hasTime : d.hasTime,
      priority: priority ?? d.priority ?? "none",
      workspace: d.workspace ?? workspace,
      tags: [...new Set([...(d.tags ?? []), ...effective.tags])],
      source: res.mode === "live" ? "ai" : "manual",
    });
    if (res.fallback) toast.message("AI unavailable — used the offline parser", { description: res.error });
    reset();
  }

  async function enhance() {
    if (!effective.title) return;
    setBusy("enhance");
    const res = await ai.enhance(effective.title);
    setBusy(null);
    // Preserve anything we already understood from the text as explicit picks.
    if (!due && parsed.dueDate) setDue({ dueDate: parsed.dueDate, hasTime: !!parsed.hasTime });
    if (!priority && parsed.priority) setPriority(parsed.priority);
    if (parsed.workspace) setWorkspace(parsed.workspace);
    const tagSuffix = effective.tags.map((t) => ` #${t}`).join("");
    setEnhancedFrom(text);
    setText(res.data.title.replace(/\.$/, "") + tagSuffix);
    if (res.fallback) toast.message("AI unavailable — used offline suggestions");
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      smartSubmit();
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      if (text) reset();
      else inputRef.current?.blur();
    }
  }

  const mod = isMac() ? "⌘" : "Ctrl";
  const hasText = text.trim().length > 0;

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "@container relative rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-200",
          focused || hasText ? "border-line-strong shadow-glow" : "border-line shadow-md",
        )}
      >
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors",
              hasText ? "bg-accent text-accent-fg" : "bg-surface-3 text-fg-faint",
            )}
            aria-hidden
          >
            {busy === "smart" ? <Spinner className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </span>
          <label htmlFor="command-input" className="sr-only">
            New task
          </label>
          <input
            id="command-input"
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (enhancedFrom && !e.target.value) setEnhancedFrom(null);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What needs to get done?"
            autoComplete="off"
            enterKeyHint="done"
            disabled={busy === "smart"}
            className="h-8 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-faint disabled:opacity-60"
          />
          {!focused && !hasText && (
            <span className="hidden items-center gap-1 sm:flex" aria-hidden>
              <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-3 pb-3 pl-[52px] @max-xl:pl-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <div className={cn("rounded-lg", dateDetected && "ring-1 ring-[var(--accent-ring)]")}>
              <DatePicker
                value={effective.dueDate}
                hasTime={effective.hasTime}
                onChange={setDue}
                now={now}
                compactLabel
              />
            </div>
            <div className={cn("rounded-lg", priorityDetected && "ring-1 ring-[var(--accent-ring)]")}>
              <PriorityPicker value={effective.priority} onChange={setPriority} compactLabel />
            </div>
            <WorkspacePicker value={effective.workspace} onChange={setWorkspace} compactLabel />
            <AnimatePresence initial={false}>
              {effective.tags.map((t) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-2 text-[12.5px] text-accent"
                >
                  <Hash className="h-3 w-3" />
                  {t}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Tooltip content="Rewrite as a clearer, actionable task">
              <Button
                variant="ghost"
                size="sm"
                onClick={enhance}
                disabled={!hasText || !!busy}
                className="hover:text-accent @max-2xl:w-8 @max-2xl:px-0"
                aria-label="Enhance with AI"
              >
                {busy === "enhance" ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
                <span className="@max-2xl:hidden">Enhance</span>
              </Button>
            </Tooltip>
            <Tooltip content="Split into smaller steps with AI">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openBreakdown(effective.title || text)}
                disabled={!hasText || !!busy}
                className="hover:text-accent @max-2xl:w-8 @max-2xl:px-0"
                aria-label="Break down with AI"
              >
                <ListTree className="h-3.5 w-3.5" />
                <span className="@max-2xl:hidden">Break down</span>
              </Button>
            </Tooltip>
            <Button type="submit" variant="primary" size="sm" disabled={!effective.title || !!busy} className="ml-0.5">
              Add
              <CornerDownLeft className="h-3 w-3 opacity-70" />
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-2 flex min-h-[18px] items-center justify-between gap-3 px-1 text-[12px] text-fg-faint">
        <AnimatePresence mode="wait" initial={false}>
          {enhancedFrom ? (
            <motion.button
              key="undo"
              type="button"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setText(enhancedFrom);
                setEnhancedFrom(null);
              }}
              className="inline-flex items-center gap-1.5 text-accent hover:underline"
            >
              <Sparkles className="h-3 w-3" /> Enhanced by Suru AI · <Undo2 className="h-3 w-3" /> Undo
            </motion.button>
          ) : (
            <motion.span
              key={hasText ? "keys" : exampleIdx}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="truncate"
            >
              {hasText ? (
                <>
                  <Kbd className="mr-1">↵</Kbd> add
                  <span className="max-sm:hidden">
                    <span className="mx-2 opacity-50">·</span>
                    <Kbd className="mr-1">{mod}↵</Kbd> add with AI parsing
                  </span>
                </>
              ) : (
                <>Try “{EXAMPLES[exampleIdx]}”</>
              )}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="hidden shrink-0 font-mono text-[11px] md:inline">!high · #tag · @work</span>
      </div>
    </div>
  );
}
