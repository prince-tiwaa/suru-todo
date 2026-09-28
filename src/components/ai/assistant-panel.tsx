"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import {
  AlarmClock,
  ArrowUp,
  LayoutList,
  ListTree,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import type { SuggestedTask } from "@/lib/types";
import { useTasks } from "@/lib/store/tasks";
import { useUi } from "@/lib/store/ui";
import { ai } from "@/lib/ai/client";
import { useTaskActions } from "@/hooks/use-task-actions";
import { useNow } from "@/hooks/use-misc";
import { cn, isMac, uid } from "@/lib/utils";
import { Kbd } from "../ui/button";
import { Tooltip } from "../ui/menu";
import { DueBadge, TaskCheckbox } from "../tasks/task-bits";
import { AiModeBadge, Markdown, SuggestionList } from "./ai-bits";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tasks?: SuggestedTask[];
  taskIds?: string[];
  fallback?: boolean;
  error?: boolean;
}

/** Conversation lives outside the component so closing the panel keeps it. */
const useChat = create<{ messages: Message[]; set: (fn: (m: Message[]) => Message[]) => void }>()((set) => ({
  messages: [],
  set: (fn) => set((s) => ({ messages: fn(s.messages) })),
}));

const PROMPTS = [
  { icon: Sun, label: "Plan my day", prompt: "What should I focus on today?" },
  { icon: AlarmClock, label: "Find overdue work", prompt: "Which tasks are overdue?" },
  { icon: ListTree, label: "Break down a task", prompt: "Break down my top task into smaller steps" },
  { icon: NotebookPen, label: "Turn notes into tasks", prompt: "Turn these notes into tasks:\n", fill: true },
  { icon: LayoutList, label: "Organise my workload", prompt: "Help me organise my workload." },
];

export function AssistantPanel({ onClose }: { onClose: () => void }) {
  const now = useNow();
  const messages = useChat((s) => s.messages);
  const setMessages = useChat((s) => s.set);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addSuggestions } = useTaskActions();
  const aiPrompt = useUi((s) => s.aiPrompt);

  // Prompts queued from elsewhere in the app (e.g. dashboard "Plan my day")
  useEffect(() => {
    if (!aiPrompt) return;
    const p = useUi.getState().consumeAiPrompt();
    if (p) send(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPrompt]);

  useEffect(() => {
    if (window.matchMedia("(hover: hover)").matches) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const history = useChat.getState().messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { id: uid(), role: "user", content }]);
    setInput("");
    setPending(true);
    const res = await ai.assistant(content, useTasks.getState().tasks, history);
    setPending(false);
    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: "assistant",
        content: res.data.reply,
        tasks: res.data.tasks,
        taskIds: res.data.taskIds,
        fallback: res.fallback,
      },
    ]);
  }

  function pickPrompt(p: (typeof PROMPTS)[number]) {
    if (p.fill) {
      setInput(p.prompt);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    } else send(p.prompt);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-soft text-accent">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[14px] font-semibold tracking-tight">Suru AI</h2>
        <AiModeBadge />
        <div className="ml-auto flex items-center gap-0.5">
          {messages.length > 0 && (
            <Tooltip content="New conversation">
              <button
                type="button"
                onClick={() => setMessages(() => [])}
                aria-label="Start a new conversation"
                className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip content={<>Close <Kbd>{isMac() ? "⌘" : "Ctrl"}J</Kbd></>}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-6 pt-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-faint">Suru AI</p>
              <h3 className="mt-2 text-[20px] font-semibold leading-tight tracking-tight text-fg">
                How can I help you move things forward?
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                I can see your tasks, so answers are about your actual workload.
              </p>
            </div>
            <div className="grid gap-1.5">
              {PROMPTS.map((p, i) => (
                <motion.button
                  key={p.label}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  onClick={() => pickPrompt(p)}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5 text-left text-[13px] text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-fg"
                >
                  <p.icon className="h-4 w-4 text-fg-faint transition-colors group-hover:text-accent" />
                  {p.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  {m.role === "user" ? (
                    <div className="flex justify-end pl-8">
                      <div className="max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-surface-3 px-3.5 py-2 text-[13.5px] text-fg">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <AssistantMessage message={m} now={now} onAdd={(t) => addSuggestions(t)} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {pending && (
              <div className="flex items-center gap-2 text-[12.5px] text-fg-faint" role="status">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-accent"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </span>
                Thinking through your tasks…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="shrink-0 border-t border-line p-3 pb-safe"
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-bg-subtle p-1.5 pl-3 transition-colors focus-within:border-line-strong">
          <label htmlFor="assistant-input" className="sr-only">
            Ask Suru AI
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your tasks…"
            className="field-sizing-content max-h-40 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] text-fg outline-none placeholder:text-fg-faint"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label="Send"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-fg-faint [@media(hover:none)]:hidden">Shift + Enter for a new line</p>
      </form>
    </div>
  );
}

function AssistantMessage({ message, now, onAdd }: { message: Message; now: Date; onAdd: (t: SuggestedTask[]) => void }) {
  const tasks = useTasks((s) => s.tasks);
  const { toggle } = useTaskActions();
  const openEditor = useUi((s) => s.openEditor);
  const referenced = (message.taskIds ?? [])
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent-soft text-accent" aria-hidden>
        <Sparkles className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <Markdown text={message.content} />
        {referenced.length > 0 && (
          <ul className="overflow-hidden rounded-xl border border-line bg-surface-2/40">
            {referenced.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-0">
                <TaskCheckbox checked={t.completed} priority={t.priority} onToggle={() => toggle(t.id)} label={t.title} size="sm" />
                <button
                  type="button"
                  onClick={() => openEditor(t.id)}
                  className={cn("min-w-0 flex-1 truncate text-left text-[13px]", t.completed ? "text-fg-faint line-through" : "text-fg")}
                >
                  {t.title}
                </button>
                <DueBadge task={t} now={now} className="text-[11px]" />
              </li>
            ))}
          </ul>
        )}
        {message.tasks && message.tasks.length > 0 && <SuggestionList tasks={message.tasks} now={now} onAdd={onAdd} />}
        {message.fallback && (
          <p className="text-[11px] text-fg-faint">Live AI didn&apos;t respond — this answer came from offline mode.</p>
        )}
      </div>
    </div>
  );
}
