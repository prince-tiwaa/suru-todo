import type { AiAction, AiResponseMap, SuggestedTask } from "../types";
import { isPriority, isWorkspace } from "../constants";
import { normalizeTag } from "../utils";

/**
 * Model output is untrusted. These helpers extract JSON from a completion and
 * coerce it into the exact shapes the UI expects, dropping anything invalid.
 * Dates stay as local wall-clock strings ("YYYY-MM-DD[THH:mm]") here; the
 * browser converts them (see client.ts → localToIso).
 */

export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return JSON");
  }
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/;
const localDate = (v: unknown) => {
  const s = str(v, 40);
  const m = s.match(LOCAL_DATE);
  return m ? m[0] : undefined;
};

function suggested(raw: unknown): SuggestedTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): SuggestedTask | null => {
      if (typeof r === "string") return r.trim() ? { title: r.trim().slice(0, 200) } : null;
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      const title = str(o.title, 200).replace(/\.$/, "");
      if (!title) return null;
      const due = localDate(o.due ?? o.dueDate);
      return {
        title,
        priority: isPriority(o.priority) ? o.priority : undefined,
        workspace: isWorkspace(o.workspace) ? o.workspace : undefined,
        dueDate: due,
        hasTime: due ? due.includes("T") : undefined,
      };
    })
    .filter((x): x is SuggestedTask => !!x)
    .slice(0, 12);
}

export function coerce<A extends AiAction>(action: A, raw: unknown): AiResponseMap[A] {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (action) {
    case "breakdown": {
      const tasks = suggested(o.tasks ?? o.subtasks);
      if (!tasks.length) throw new Error("Empty breakdown");
      return { summary: str(o.summary, 240) || undefined, tasks } as AiResponseMap[A];
    }
    case "enhance": {
      const title = str(o.title, 240);
      if (!title) throw new Error("Empty enhancement");
      return { title, reason: str(o.reason, 160) || undefined } as AiResponseMap[A];
    }
    case "parse": {
      const title = str(o.title, 240);
      if (!title) throw new Error("Empty parse");
      const due = localDate(o.due ?? o.dueDate);
      return {
        title,
        dueDate: due,
        hasTime: due ? due.includes("T") : undefined,
        priority: isPriority(o.priority) ? o.priority : undefined,
        workspace: isWorkspace(o.workspace) ? o.workspace : undefined,
        tags: Array.isArray(o.tags) ? o.tags.map((t) => normalizeTag(String(t))).filter(Boolean).slice(0, 5) : undefined,
      } as AiResponseMap[A];
    }
    case "assistant": {
      const reply = str(o.reply, 4000);
      if (!reply) throw new Error("Empty reply");
      const tasks = suggested(o.tasks);
      const taskIds = Array.isArray(o.taskIds) ? o.taskIds.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
      return { reply, tasks: tasks.length ? tasks : undefined, taskIds } as AiResponseMap[A];
    }
    default:
      throw new Error("Unknown action");
  }
}
