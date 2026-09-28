"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ListTree, Sparkles, Trash2, X } from "lucide-react";
import type { Priority, Task, WorkspaceId } from "@/lib/types";
import { PRIORITIES, WORKSPACES } from "@/lib/constants";
import { useTasks } from "@/lib/store/tasks";
import { useUi } from "@/lib/store/ui";
import { ai } from "@/lib/ai/client";
import { useTaskActions } from "@/hooks/use-task-actions";
import { useNow } from "@/hooks/use-misc";
import { relativeTime } from "@/lib/dates";
import { cn, isMac, normalizeTag } from "@/lib/utils";
import { Dialog } from "../ui/dialog";
import { Button, Kbd, Spinner } from "../ui/button";
import { PriorityIcon, WorkspaceDot } from "../ui/misc";
import { DatePicker } from "./pickers";
import { TaskCheckbox } from "./task-bits";

export function TaskEditor() {
  const editingId = useUi((s) => s.editingId);
  const openEditor = useUi((s) => s.openEditor);
  const task = useTasks((s) => s.tasks.find((t) => t.id === editingId));
  const open = !!editingId && !!task;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && openEditor(null)}
      title="Edit task"
      hideHeader
      size="lg"
      onOpenAutoFocus={(e) => {
        // Don't pop the keyboard open on touch devices
        if (!window.matchMedia("(hover: hover)").matches) e.preventDefault();
      }}
    >
      {task && <EditorForm key={task.id} task={task} onClose={() => openEditor(null)} />}
    </Dialog>
  );
}

function EditorForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const now = useNow();
  const updateTask = useTasks((s) => s.updateTask);
  const openBreakdown = useUi((s) => s.openBreakdown);
  const { toggle, remove } = useTaskActions();

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [workspace, setWorkspace] = useState<WorkspaceId>(task.workspace);
  const [due, setDue] = useState({ dueDate: task.dueDate, hasTime: !!task.hasTime });
  const [tags, setTags] = useState<string[]>(task.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [suggestion, setSuggestion] = useState<{ title: string; reason?: string } | null>(null);

  const dirty =
    title.trim() !== task.title ||
    notes.trim() !== (task.notes ?? "") ||
    priority !== task.priority ||
    workspace !== task.workspace ||
    due.dueDate !== task.dueDate ||
    due.hasTime !== !!task.hasTime ||
    tags.join() !== task.tags.join();

  function save() {
    if (!title.trim()) return;
    updateTask(task.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      workspace,
      dueDate: due.dueDate,
      hasTime: due.dueDate ? due.hasTime : false,
      tags,
    });
    onClose();
  }

  function addTag(raw: string) {
    const t = normalizeTag(raw);
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }

  async function enhance() {
    setEnhancing(true);
    const res = await ai.enhance(title, notes);
    setEnhancing(false);
    setSuggestion(res.data);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="-mt-1"
    >
      <div className="flex items-start gap-3">
        <div className="pt-[7px]">
          <TaskCheckbox checked={task.completed} priority={priority} onToggle={() => toggle(task.id)} label={task.title} />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="edit-title" className="sr-only">
            Title
          </label>
          <textarea
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                save();
              }
            }}
            rows={1}
            className="field-sizing-content w-full resize-none bg-transparent pr-8 text-[18px] font-semibold leading-snug tracking-tight text-fg outline-none placeholder:text-fg-faint"
            placeholder="Task title"
          />
          <label htmlFor="edit-notes" className="sr-only">
            Notes
          </label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add notes…"
            className="field-sizing-content mt-1 min-h-[44px] w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-fg-muted outline-none placeholder:text-fg-faint"
          />
        </div>
      </div>

      {/* AI tools */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={enhance} disabled={enhancing || !title.trim()}>
          {enhancing ? <Spinner /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
          Improve with AI
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onClose();
            openBreakdown(title);
          }}
          disabled={!title.trim()}
        >
          <ListTree className="h-3.5 w-3.5 text-accent" />
          Break into steps
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-line bg-accent-soft p-3">
              <p className="text-[13.5px] text-fg">{suggestion.title}</p>
              {suggestion.reason && <p className="mt-1 text-[12px] text-fg-muted">{suggestion.reason}</p>}
              <div className="mt-2.5 flex gap-1.5">
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => {
                    setTitle(suggestion.title.replace(/\.$/, ""));
                    setSuggestion(null);
                  }}
                >
                  <Check className="h-3 w-3" /> Use this
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setSuggestion(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Properties */}
      <dl className="mt-5 divide-y divide-line rounded-xl border border-line text-[13px]">
        <Row label="Due">
          <DatePicker value={due.dueDate} hasTime={due.hasTime} onChange={(v) => setDue({ dueDate: v.dueDate, hasTime: v.hasTime })} now={now} />
        </Row>
        <Row label="Priority">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={priority === p.id}
                aria-label={p.label}
                onClick={() => setPriority(p.id)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[12px] transition-colors",
                  priority === p.id
                    ? "border-line-strong bg-surface-3 text-fg"
                    : "border-transparent text-fg-faint hover:text-fg-muted",
                )}
              >
                <PriorityIcon priority={p.id} />
                <span className={cn(p.id === "none" && "max-sm:hidden")}>{p.id === "none" ? "None" : p.label}</span>
              </button>
            ))}
          </div>
        </Row>
        <Row label="Workspace">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Workspace">
            {WORKSPACES.map((w) => (
              <button
                key={w.id}
                type="button"
                role="radio"
                aria-checked={workspace === w.id}
                onClick={() => setWorkspace(w.id)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[12px] transition-colors",
                  workspace === w.id
                    ? "border-line-strong bg-surface-3 text-fg"
                    : "border-transparent text-fg-faint hover:text-fg-muted",
                )}
              >
                <WorkspaceDot id={w.id} /> {w.label}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Tags">
          <div className="flex min-h-7 flex-wrap items-center gap-1">
            {tags.map((t) => (
              <span key={t} className="inline-flex h-6 items-center gap-1 rounded-md bg-surface-3 pl-2 pr-1 text-[12px] text-fg-muted">
                #{t}
                <button
                  type="button"
                  aria-label={`Remove tag ${t}`}
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="grid h-4 w-4 place-items-center rounded text-fg-faint hover:text-fg"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <label htmlFor="edit-tag" className="sr-only">
              Add tag
            </label>
            <input
              id="edit-tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  e.stopPropagation();
                  addTag(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder={tags.length ? "" : "Add a tag"}
              className="h-7 min-w-[80px] flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-faint"
            />
          </div>
        </Row>
      </dl>

      <p className="mt-3 font-mono text-[11px] text-fg-faint">
        Created {relativeTime(task.createdAt, now)}
        {task.completed && task.completedAt ? ` · Completed ${relativeTime(task.completedAt, now)}` : ""}
        {task.source === "ai" ? " · via Suru AI" : ""}
      </p>

      <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
        <AnimatePresence mode="wait" initial={false}>
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-[12.5px] text-fg-muted max-sm:hidden">Delete this task?</span>
              <Button size="sm" variant="danger" onClick={() => remove(task.id)}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </motion.div>
          ) : (
            <motion.div key="del" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={!dirty || !title.trim()}>
            Save
            <Kbd className="border-transparent bg-black/10 text-current opacity-70 max-sm:hidden">
              {isMac() ? "⌘" : "Ctrl"}↵
            </Kbd>
          </Button>
        </div>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <dt className="w-[76px] shrink-0 text-[12px] text-fg-faint">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
