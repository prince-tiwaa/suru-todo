import * as chrono from "chrono-node";
import type { ParsedTask, Priority, WorkspaceId } from "../types";
import { capitalize, normalizeTag } from "../utils";
import { dateOnly } from "../dates";

/**
 * Local, instant natural-language task parser.
 *
 * Understands:
 *   "Remind me to submit the scholarship application next Friday at 10am"
 *   "Ship landing page tomorrow !high @work #launch"
 *   "p1 call the bank by monday"
 *
 * Runs on every keystroke in the command bar (for the live preview chips),
 * and is the fallback for AI parsing when no model is configured.
 */

const LEAD_INS = [
  /^(please\s+)?remind me (to|that i need to|that i have to|about)\s+/i,
  /^(please\s+)?(don'?t|do not) (let me )?forget (to\s+)?/i,
  /^(i )?(need|have|want|got) to\s+/i,
  /^(i )?should\s+/i,
  /^remember to\s+/i,
  /^make sure (to|i)\s+/i,
  /^todo:?\s+/i,
  /^task:?\s+/i,
];

const PRIORITY_PATTERNS: [RegExp, Priority][] = [
  [/(^|\s)(!urgent|!!!|!1|p1)(?=\s|$)/i, "urgent"],
  [/(^|\s)(!high|!!|!2|p2)(?=\s|$)/i, "high"],
  [/(^|\s)(!medium|!med|!3|p3)(?=\s|$)/i, "medium"],
  [/(^|\s)(!low|!4|p4)(?=\s|$)/i, "low"],
  [/(^|\s)(asap|urgently)(?=\s|[.,!]|$)/i, "urgent"],
  [/(^|\s)(high priority|important)(?=\s|[.,!]|$)/i, "high"],
  [/(^|\s)(low priority)(?=\s|[.,!]|$)/i, "low"],
];

const WORKSPACE_PATTERNS: [RegExp, WorkspaceId][] = [
  [/(^|\s)@work(?=\s|$)/i, "work"],
  [/(^|\s)@personal(?=\s|$)/i, "personal"],
  [/(^|\s)@(projects?|proj)(?=\s|$)/i, "projects"],
];

export interface ParseChip {
  kind: "date" | "priority" | "workspace" | "tag";
  label: string;
}

export interface LocalParseResult extends ParsedTask {
  chips: ParseChip[];
}

export function parseTaskInput(input: string, now = new Date()): LocalParseResult {
  let text = ` ${input.trim()} `;
  const chips: ParseChip[] = [];
  const result: LocalParseResult = { title: "", chips };

  // Priority
  for (const [re, p] of PRIORITY_PATTERNS) {
    if (re.test(text)) {
      result.priority = p;
      text = text.replace(re, " ");
      chips.push({ kind: "priority", label: p });
      break;
    }
  }

  // Workspace
  for (const [re, w] of WORKSPACE_PATTERNS) {
    if (re.test(text)) {
      result.workspace = w;
      text = text.replace(re, " ");
      chips.push({ kind: "workspace", label: w });
      break;
    }
  }

  // Tags
  const tags: string[] = [];
  text = text.replace(/(^|\s)#([\p{L}\p{N}_-]{1,24})/gu, (_m, pre: string, tag: string) => {
    const t = normalizeTag(tag);
    if (t && !tags.includes(t)) tags.push(t);
    return pre;
  });
  if (tags.length) {
    result.tags = tags;
    tags.forEach((t) => chips.push({ kind: "tag", label: t }));
  }

  // Date / time (chrono)
  const parsed = chrono.parse(text, now, { forwardDate: true });
  const hit = parsed[0];
  if (hit) {
    const date = hit.start.date();
    const hasTime = hit.start.isCertain("hour");
    result.dueDate = hasTime ? date.toISOString() : dateOnly(date);
    result.hasTime = hasTime;
    // Remove the date phrase plus a dangling preposition before it ("by", "on", "at", "due")
    const before = text.slice(0, hit.index).replace(/\s+(by|on|at|due|for|before|until)\s*$/i, " ");
    text = before + text.slice(hit.index + hit.text.length);
    chips.push({ kind: "date", label: hit.text.trim() });
  }

  // Lead-in phrases
  let title = text.replace(/\s+/g, " ").trim();
  for (const re of LEAD_INS) title = title.replace(re, "");
  title = title.replace(/\s+(by|on|at|due)$/i, "").replace(/[\s,;:-]+$/, "").trim();

  result.title = capitalize(title);
  return result;
}
