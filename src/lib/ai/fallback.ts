/**
 * Suru demo intelligence.
 *
 * A deterministic, rules-based stand-in for the language model so every AI
 * surface keeps working without an API key (local dev, reviewers, outages).
 * It is intentionally honest: the UI labels results as "Demo mode".
 */
import type { AiRequestMap, AiResponseMap, Priority, SuggestedTask, TaskContext } from "../types";
import { parseTaskInput } from "../nlp/parse-task";
import { capitalize } from "../utils";
import { dayDiff, formatDue, isSameDay } from "../dates";
import { PRIORITY_RANK } from "../constants";

/* ----------------------------- Breakdown ----------------------------- */

type Template = { match: RegExp; summary: string; steps: [string, Priority?][] };

const TEMPLATES: Template[] = [
  {
    match: /(grad(uate)? (school|program|application)|master'?s|phd|university application|postgrad|admission)/i,
    summary: "A graduate application moves fastest when research and documents run in parallel.",
    steps: [
      ["Research suitable programs", "high"],
      ["Prepare academic CV", "high"],
      ["Draft statement of purpose", "high"],
      ["Request recommendation letters", "urgent"],
      ["Gather transcripts", "medium"],
      ["Review application deadlines", "urgent"],
    ],
  },
  {
    match: /(job|interview|role|position|career|internship)/i,
    summary: "Treat the search like a pipeline: materials first, then outreach, then practice.",
    steps: [
      ["Update CV with recent achievements", "high"],
      ["Shortlist 10 target companies", "medium"],
      ["Tailor cover letter for top 3 roles", "high"],
      ["Reach out to two people for referrals", "medium"],
      ["Practise answers to common interview questions", "medium"],
      ["Track applications and follow-up dates", "low"],
    ],
  },
  {
    match: /(presentation|slides|talk|pitch|demo day|keynote)/i,
    summary: "Nail the story before the slides — design is the last 20%.",
    steps: [
      ["Define the one key message for the audience", "high"],
      ["Outline the narrative in 5–7 beats", "high"],
      ["Draft slides for each beat", "medium"],
      ["Add visuals and data to support claims", "medium"],
      ["Rehearse end-to-end with a timer", "high"],
      ["Prepare answers to likely questions", "low"],
    ],
  },
  {
    match: /\b(launch|release|ship|go live|deploy)/i,
    summary: "A calm launch is mostly a checklist completed the day before.",
    steps: [
      ["Freeze scope and list must-have items", "urgent"],
      ["Run a full QA pass on critical flows", "high"],
      ["Prepare launch announcement copy", "medium"],
      ["Set up monitoring and error alerts", "high"],
      ["Write a rollback plan", "medium"],
      ["Schedule a post-launch review", "low"],
    ],
  },
  {
    match: /\b(website|site|web app|app|mvp|product|feature|api)\b/i,
    summary: "Build the thinnest working slice first, then widen it.",
    steps: [
      ["Write a one-paragraph problem statement", "high"],
      ["Sketch the core user flow", "high"],
      ["Set up the project and deployment pipeline", "medium"],
      ["Build the first end-to-end feature", "urgent"],
      ["Test with two real users", "medium"],
      ["Collect feedback and plan the next iteration", "low"],
    ],
  },
  {
    match: /(move|moving|relocat|apartment|house)/i,
    summary: "Moving is logistics — lock in dates, then work backwards.",
    steps: [
      ["Confirm the move date", "urgent"],
      ["Get quotes from two moving services", "high"],
      ["Declutter and donate unused items", "medium"],
      ["Update address with bank and employer", "medium"],
      ["Pack non-essentials a week early", "medium"],
      ["Arrange utilities for the new place", "high"],
    ],
  },
  {
    match: /(trip|travel|vacation|holiday|visit)/i,
    summary: "Book the hard-to-change things first.",
    steps: [
      ["Set dates and budget", "high"],
      ["Book flights or transport", "urgent"],
      ["Book accommodation", "high"],
      ["Check travel documents and visas", "urgent"],
      ["Draft a loose daily itinerary", "low"],
      ["Pack using a checklist", "medium"],
    ],
  },
  {
    match: /(learn|study|course|exam|revise|certification)/i,
    summary: "Short, scheduled sessions beat long occasional ones.",
    steps: [
      ["Define what 'done' looks like for this goal", "high"],
      ["Pick one primary resource", "medium"],
      ["Schedule four 45-minute study sessions this week", "high"],
      ["Practise with exercises or past questions", "medium"],
      ["Summarise key concepts in your own words", "medium"],
      ["Review weak areas before the deadline", "high"],
    ],
  },
  {
    match: /(event|party|wedding|meetup|birthday|conference)/i,
    summary: "Guests, venue, date — everything else follows.",
    steps: [
      ["Fix the date and guest count", "urgent"],
      ["Set a budget", "high"],
      ["Book the venue", "high"],
      ["Send invitations", "medium"],
      ["Arrange food and drinks", "medium"],
      ["Confirm final details two days before", "high"],
    ],
  },
  {
    match: /(report|essay|thesis|paper|article|documentation|proposal|write)/i,
    summary: "Separate thinking, drafting and editing into distinct sessions.",
    steps: [
      ["Gather sources and notes", "medium"],
      ["Outline the structure", "high"],
      ["Write a rough first draft", "high"],
      ["Revise for clarity and flow", "medium"],
      ["Proofread and format", "low"],
      ["Submit or share for review", "urgent"],
    ],
  },
];

export function demoBreakdown({ goal }: AiRequestMap["breakdown"]): AiResponseMap["breakdown"] {
  const clean = goal.trim().replace(/[.!?]+$/, "");
  const t = TEMPLATES.find((tpl) => tpl.match.test(clean));
  if (t) {
    return { summary: t.summary, tasks: t.steps.map(([title, priority]) => ({ title, priority: priority ?? "medium" })) };
  }
  const subject = clean.replace(/^(i (need|want|have) to|plan|prepare|organi[sz]e|finish|complete|do)\s+/i, "");
  return {
    summary: "Here's a general plan — edit any step to make it yours.",
    tasks: [
      { title: `Clarify the goal and deadline for “${subject}”`, priority: "high" },
      { title: "List everything needed to get it done", priority: "medium" },
      { title: "Do the smallest first step (15 minutes)", priority: "urgent" },
      { title: "Block focused time on the calendar", priority: "medium" },
      { title: "Review progress and adjust the plan", priority: "low" },
    ],
  };
}

/* ------------------------------ Enhance ------------------------------ */

const ENHANCERS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^work on (the )?project$/i, () => "Complete the authentication flow and test login/logout behaviour"],
  [/^work on (.+)$/i, (m) => `Finish the next concrete milestone of ${m[1]} and note any blockers`],
  [/^(email|message|text) (.+)$/i, (m) => `${capitalize(m[1])} ${m[2]} with a clear ask and a reply-by date`],
  [/^call (.+)$/i, (m) => `Call ${m[1]} to confirm next steps and agree on a follow-up`],
  [/^(study|revise) (.+)$/i, (m) => `Study ${m[2]} for 45 minutes and summarise the key points`],
  [/^read (.+)$/i, (m) => `Read ${m[1]} and capture three key takeaways`],
  [/^fix (.+)$/i, (m) => `Reproduce, fix and verify ${m[1]}, then add a regression test`],
  [/^(clean|tidy) (.+)$/i, (m) => `Tidy ${m[2]} for 20 minutes, starting with the most visible area`],
  [/^(prepare|prep) (.+)$/i, (m) => `Prepare ${m[2]} and review it once before sharing`],
  [/^(meeting|meet) (with )?(.+)$/i, (m) => `Meet ${m[3]} with a written agenda and capture action items`],
  [/^(gym|exercise|workout)$/i, () => "Do a 45-minute strength workout and log the sets"],
  [/^(groceries|shopping)$/i, () => "Buy groceries for the week using a prepared list"],
  [/^(write|draft) (.+)$/i, (m) => `Draft ${m[2]} — aim for a complete rough version, not perfection`],
  [/^(plan|organi[sz]e) (.+)$/i, (m) => `Plan ${m[2]}: list the steps, owners and a target date`],
  [/^(update|review) (.+)$/i, (m) => `${capitalize(m[1])} ${m[2]} and flag anything that needs a decision`],
];

export function demoEnhance({ title }: AiRequestMap["enhance"]): AiResponseMap["enhance"] {
  const base = title.trim().replace(/[.!]+$/, "");
  for (const [re, fn] of ENHANCERS) {
    const m = base.match(re);
    if (m) return { title: fn(m) + ".", reason: "Made it specific and actionable with a clear finish line." };
  }
  const words = base.split(/\s+/);
  if (words.length <= 2) {
    return {
      title: `Make progress on ${base.toLowerCase()} — define the first concrete step and finish it.`,
      reason: "Short tasks are easy to postpone; this adds a clear first action.",
    };
  }
  return {
    title: `${capitalize(base)} — and define what “done” looks like.`,
    reason: "Added an explicit finish line so the task can actually be completed.",
  };
}

/* ------------------------------- Parse ------------------------------- */

export function demoParse({ text, now }: AiRequestMap["parse"]): AiResponseMap["parse"] {
  const r = parseTaskInput(text, new Date(now));
  return { title: r.title, dueDate: r.dueDate, hasTime: r.hasTime, priority: r.priority, workspace: r.workspace, tags: r.tags };
}

/* ----------------------------- Assistant ----------------------------- */

const rank = (t: TaskContext, now: Date) => {
  let s = PRIORITY_RANK[t.priority] * 10;
  if (t.dueDate) {
    const d = dayDiff(new Date(t.dueDate), now);
    if (d < 0) s += 50;
    else if (d === 0) s += 35;
    else if (d === 1) s += 15;
  }
  return s;
};

const line = (t: TaskContext, now: Date) =>
  `- **${t.title}**${t.dueDate ? ` · ${formatDue(t.dueDate, t.hasTime, now)}` : ""}${
    t.priority !== "none" ? ` · ${t.priority}` : ""
  }`;

function extractQuoted(msg: string) {
  const q = msg.match(/[“"']([^“”"']{3,})[”"']/);
  if (q) return q[1];
  const colon = msg.split(/:\s*/);
  if (colon.length > 1 && colon.slice(1).join(":").trim().length > 2) return colon.slice(1).join(":").trim();
  return null;
}

export function demoAssistant(req: AiRequestMap["assistant"]): AiResponseMap["assistant"] {
  const now = new Date(req.now);
  const msg = req.message.trim();
  const lower = msg.toLowerCase();
  const active = req.tasks.filter((t) => !t.completed);
  const overdue = active.filter((t) => t.dueDate && new Date(t.dueDate) < now && !isSameDay(new Date(t.dueDate), now));
  const today = active.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), now));

  // Turn notes into tasks
  if (/(notes?|list|these).*(into|to) tasks|turn (this|these)|convert/.test(lower) || msg.includes("\n")) {
    const body = msg.includes("\n") ? msg.split("\n").slice(1).join("\n") : extractQuoted(msg) ?? "";
    const parts = body
      .split(/\n|;|(?<=\.)\s+|,\s*(?:and\s+)?|\band then\b/i)
      .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((s) => s.length > 2);
    if (parts.length) {
      const tasks: SuggestedTask[] = parts.slice(0, 12).map((p) => {
        const r = parseTaskInput(p, now);
        return { title: r.title, dueDate: r.dueDate, hasTime: r.hasTime, priority: r.priority, tags: r.tags };
      });
      return { reply: `I found **${tasks.length} actionable items** in your notes. Pick the ones you want to keep.`, tasks };
    }
    return {
      reply:
        "Paste your notes after a new line (or after a colon) and I'll turn each point into a task.\n\nFor example:\n- *Turn these into tasks: email Tolu about the venue, book flights, finish budget by Friday*",
    };
  }

  // Break down
  if (/break (this|it|.+)? ?(down|into)|smaller steps|subtasks|split/.test(lower)) {
    const target =
      extractQuoted(msg) ??
      msg.replace(/.*?(break down|break|split)\s*/i, "").replace(/into smaller steps|into steps|[.?!]+$/gi, "").trim();
    const goal =
      target && target.length > 3 && !/^(this|it|(this|my|the)( (top|next|most important|biggest))? task)\s*[.?!]*$/i.test(target)
        ? target
        : [...active].sort((a, b) => rank(b, now) - rank(a, now))[0]?.title;
    if (!goal) return { reply: "Tell me which task to break down — e.g. *Break down: launch my portfolio site*." };
    const b = demoBreakdown({ goal, now: req.now });
    return { reply: `Here's a breakdown of **${goal}**. ${b.summary ?? ""}`, tasks: b.tasks };
  }

  // Overdue
  if (/overdue|late|behind|missed/.test(lower)) {
    if (!overdue.length) return { reply: "Nothing is overdue. **You're on track** — nice work keeping things current." };
    return {
      reply: `You have **${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"}**:\n\n${overdue
        .map((t) => line(t, now))
        .join("\n")}\n\nStart with the highest priority one, or reschedule anything that's no longer realistic.`,
      taskIds: overdue.map((t) => t.id),
    };
  }

  // Organise workload
  if (/organi[sz]e|workload|overwhelm|too much|prioriti[sz]e|balance/.test(lower)) {
    const groups = (["work", "projects", "personal"] as const)
      .map((w) => ({ w, n: active.filter((t) => t.workspace === w).length }))
      .filter((g) => g.n);
    const noDate = active.filter((t) => !t.dueDate);
    const urgent = active.filter((t) => t.priority === "urgent" || t.priority === "high");
    return {
      reply: [
        `You have **${active.length} open tasks** — ${groups.map((g) => `${g.n} in ${g.w}`).join(", ")}.`,
        "",
        "Here's a way to organise them:",
        `- **Do now:** ${overdue.length + today.length} tasks are overdue or due today. Clear these first.`,
        `- **Protect time for:** ${urgent.length} high-priority tasks. Block one focused session for the top two.`,
        `- **Schedule:** ${noDate.length} tasks have no due date. Give each a realistic day or drop it.`,
        "- **Batch:** group small admin tasks into a single 30-minute slot.",
      ].join("\n"),
      taskIds: [...overdue, ...today].map((t) => t.id),
    };
  }

  // Focus / plan my day (default for most planning questions)
  if (/focus|today|plan|priorit|start|what should|what do|next|day|work on|help/.test(lower)) {
    const top = [...active].sort((a, b) => rank(b, now) - rank(a, now)).slice(0, 3);
    if (!top.length) return { reply: "Your list is clear. Add something you want to move forward today, and I'll help you plan it." };
    const intro =
      overdue.length > 0
        ? `You have **${overdue.length} overdue** and **${today.length} due today**. I'd focus on these three:`
        : today.length > 0
          ? `**${today.length} ${today.length === 1 ? "task is" : "tasks are"} due today.** Here's where I'd put your energy:`
          : "Nothing is due today, so it's a good day to get ahead. I'd focus on:";
    return {
      reply: `${intro}\n\n${top.map((t, i) => `${i + 1}. **${t.title}**${t.dueDate ? ` — ${formatDue(t.dueDate, t.hasTime, now)}` : ""}`).join("\n")}\n\nTackle the first one before checking messages. Everything else can wait until these are moving.`,
      taskIds: top.map((t) => t.id),
    };
  }

  return {
    reply: "I can plan your day, find overdue work, break a task into steps, or turn notes into tasks. What would help most?",
  };
}

export function runDemo<A extends keyof AiRequestMap>(action: A, payload: AiRequestMap[A]): AiResponseMap[A] {
  switch (action) {
    case "breakdown":
      return demoBreakdown(payload as AiRequestMap["breakdown"]) as AiResponseMap[A];
    case "enhance":
      return demoEnhance(payload as AiRequestMap["enhance"]) as AiResponseMap[A];
    case "parse":
      return demoParse(payload as AiRequestMap["parse"]) as AiResponseMap[A];
    case "assistant":
      return demoAssistant(payload as AiRequestMap["assistant"]) as AiResponseMap[A];
    default:
      throw new Error(`Unknown action ${String(action)}`);
  }
}
