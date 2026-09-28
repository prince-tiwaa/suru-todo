import type { AiRequestMap } from "../types";

/**
 * Prompt builders. Every action asks for strict JSON so responses can be
 * validated and rendered as structured UI (not just a wall of chat text).
 * Dates are exchanged as *local* wall-clock strings: "YYYY-MM-DD" or
 * "YYYY-MM-DDTHH:mm" — the browser converts them using the user's timezone.
 */

const weekday = (now: string) => {
  const d = new Date(now);
  return Number.isNaN(d.getTime()) ? "" : ` (${d.toLocaleDateString("en-US", { weekday: "long" })})`;
};

const BASE = `You are Suru, a calm, concise productivity assistant inside a task manager.
Write tasks as short imperative actions (start with a verb, max ~12 words, no trailing period).
Priorities: "urgent" | "high" | "medium" | "low" | "none". Workspaces: "personal" | "work" | "projects".
Always respond with a single JSON object and nothing else — no markdown fences.`;

export function buildPrompt<A extends keyof AiRequestMap>(
  action: A,
  payload: AiRequestMap[A],
): { system: string; user: string } {
  switch (action) {
    case "breakdown": {
      const p = payload as AiRequestMap["breakdown"];
      return {
        system: `${BASE}
Break the user's goal into 4–8 concrete, sequential subtasks that each take under a day.
JSON shape: {"summary": string (one encouraging sentence of strategy), "tasks": [{"title": string, "priority": string}]}`,
        user: `Goal: ${p.goal}`,
      };
    }
    case "enhance": {
      const p = payload as AiRequestMap["enhance"];
      return {
        system: `${BASE}
Rewrite a vague task into one specific, actionable task with a clear definition of done. Keep the user's intent; don't invent facts beyond reasonable specificity. Max 18 words.
JSON shape: {"title": string, "reason": string (max 12 words explaining the improvement)}`,
        user: `Task: ${p.title}${p.notes ? `\nNotes: ${p.notes}` : ""}`,
      };
    }
    case "parse": {
      const p = payload as AiRequestMap["parse"];
      return {
        system: `${BASE}
Extract a task from natural language. Remove filler like "remind me to". Resolve relative dates against the current local time.
JSON shape: {"title": string, "due": "YYYY-MM-DD" | "YYYY-MM-DDTHH:mm" | null, "priority": string, "workspace": string | null, "tags": string[]}`,
        user: `Current local time: ${p.now}${weekday(p.now)}, timezone ${p.timezone}\nInput: ${p.text}`,
      };
    }
    case "assistant": {
      const p = payload as AiRequestMap["assistant"];
      const tasks = p.tasks
        .map(
          (t) =>
            `${t.id} | ${t.completed ? "done" : "open"} | ${t.title} | ${t.priority} | ${t.workspace} | due: ${t.dueDate ?? "none"}${t.tags.length ? ` | #${t.tags.join(" #")}` : ""}`,
        )
        .join("\n");
      return {
        system: `${BASE}
You help the user decide what to do, spot overdue work, organise their workload, break tasks down and turn notes into tasks.
Use the user's real task list below. Be specific and brief (under 120 words). Refer to tasks by their title in **bold**.
Use simple markdown in "reply": **bold**, bullet lines starting with "- ", numbered lines "1. ". No headings.
If you propose NEW tasks the user could add, put them in "tasks" (max 10). If you reference existing tasks, list their ids in "taskIds".
JSON shape: {"reply": string, "tasks": [{"title": string, "priority": string, "due": string | null}] , "taskIds": string[]}

Current local time: ${p.now}${weekday(p.now)}, timezone ${p.timezone}
Tasks (id | status | title | priority | workspace | due, local time):
${tasks || "(no tasks yet)"}`,
        user: p.history?.length
          ? `Conversation so far:\n${p.history
              .slice(-6)
              .map((h) => `${h.role === "user" ? "User" : "Suru"}: ${h.content.slice(0, 600)}`)
              .join("\n")}\n\nUser: ${p.message}`
          : p.message,
      };
    }
    default:
      throw new Error("Unknown action");
  }
}
