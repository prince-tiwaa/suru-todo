"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ListTree, RefreshCw, Sparkles } from "lucide-react";
import type { SuggestedTask, WorkspaceId } from "@/lib/types";
import { useUi } from "@/lib/store/ui";
import { ai } from "@/lib/ai/client";
import { useTaskActions } from "@/hooks/use-task-actions";
import { useNow } from "@/hooks/use-misc";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { WorkspacePicker } from "../tasks/pickers";
import { AiModeBadge, SuggestionList, ThinkingRows } from "./ai-bits";

export function BreakdownDialog() {
  const open = useUi((s) => s.dialog === "breakdown");
  const goal = useUi((s) => s.breakdownGoal);
  const openDialog = useUi((s) => s.openDialog);
  const view = useUi((s) => s.view);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && openDialog(null)}
      title={
        <span className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-accent" /> Break it down <AiModeBadge />
        </span>
      }
      description="Turn a big intention into small, finishable steps."
      size="lg"
    >
      {open && (
        <BreakdownBody
          key={goal}
          initialGoal={goal}
          defaultWorkspace={view.startsWith("workspace:") ? (view.split(":")[1] as WorkspaceId) : "personal"}
        />
      )}
    </Dialog>
  );
}

function BreakdownBody({ initialGoal, defaultWorkspace }: { initialGoal: string; defaultWorkspace: WorkspaceId }) {
  const now = useNow();
  const { addSuggestions } = useTaskActions();
  const [goal, setGoal] = useState(initialGoal);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary?: string; tasks: SuggestedTask[]; fallback?: boolean } | null>(null);
  const [run, setRun] = useState(0);
  const [workspace, setWorkspace] = useState<WorkspaceId>(defaultWorkspace);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  async function generate(g = goal) {
    if (!g.trim()) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await ai.breakdown(g.trim());
    setResult({ ...res.data, fallback: res.fallback });
    setRun((r) => r + 1);
    setLoading(false);
  }

  useEffect(() => {
    if (!started.current && initialGoal.trim()) {
      started.current = true;
      generate(initialGoal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
        className="flex items-center gap-2 rounded-xl border border-line bg-bg-subtle p-1.5 pl-3 focus-within:border-line-strong"
      >
        <label htmlFor="breakdown-goal" className="sr-only">
          Goal to break down
        </label>
        <input
          id="breakdown-goal"
          ref={inputRef}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Prepare my application for graduate school"
          className="h-8 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-faint"
        />
        <Button type="submit" size="sm" variant={result ? "ghost" : "primary"} loading={loading} disabled={!goal.trim()}>
          {!loading && (result ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />)}
          {result ? "Regenerate" : "Generate"}
        </Button>
      </form>

      <div className="mt-4 min-h-[120px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ThinkingRows />
            </motion.div>
          ) : result ? (
            <motion.div key={`r${run}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {result.summary && (
                <p className="mb-3 flex gap-2 text-[13px] leading-relaxed text-fg-muted">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  {result.summary}
                </p>
              )}
              <div className="mb-2 flex items-center justify-between text-[12px] text-fg-faint">
                <span>{result.tasks.length} steps · edit any before adding</span>
                <span className="flex items-center gap-1.5">
                  Add to <WorkspacePicker value={workspace} onChange={setWorkspace} />
                </span>
              </div>
              <SuggestionList
                tasks={result.tasks}
                now={now}
                editable
                onEdit={(i, title) =>
                  setResult((r) => (r ? { ...r, tasks: r.tasks.map((t, j) => (j === i ? { ...t, title } : t)) } : r))
                }
                onAdd={(tasks) =>
                  addSuggestions(tasks.filter((t) => t.title.trim()), { workspace, notes: `Step towards: ${goal.trim()}` })
                }
              />
              {result.fallback && (
                <p className="mt-2 text-[11.5px] text-fg-faint">The AI service didn&apos;t respond, so these came from offline suggestions.</p>
              )}
            </motion.div>
          ) : (
            <motion.p key="empty" className="py-8 text-center text-[13px] text-fg-faint">
              Describe a goal and Suru will suggest the steps.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
