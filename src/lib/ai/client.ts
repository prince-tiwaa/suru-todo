"use client";

import type { AiAction, AiMode, AiRequestMap, AiResponseMap, SuggestedTask, Task } from "../types";
import { runDemo } from "./fallback";
import { toContext } from "../selectors";

/**
 * Browser-side AI client.
 *  - Asks the server once which mode it's in (live model vs demo).
 *  - In demo mode the rules engine runs locally (instant, correct timezone).
 *  - In live mode it calls /api/ai; if that fails it falls back to demo so
 *    the UI never dead-ends. `fallback: true` lets the UI say so.
 */

export interface AiStatus {
  mode: AiMode;
  provider: string | null;
  model: string | null;
}

let statusPromise: Promise<AiStatus> | null = null;

export function getAiStatus(): Promise<AiStatus> {
  if (!statusPromise) {
    statusPromise = fetch("/api/ai", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : Promise.reject(r.status)))
      .catch(() => ({ mode: "demo" as const, provider: null, model: null }));
  }
  return statusPromise;
}

export interface AiResult<A extends AiAction> {
  data: AiResponseMap[A];
  mode: AiMode;
  /** True when a live request failed and the demo engine answered instead. */
  fallback?: boolean;
  error?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Local wall-clock "YYYY-MM-DDTHH:mm" */
export function localNaive(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converts model dates (local wall-clock) or ISO strings into ISO. */
export function localToIso(v?: string): { dueDate?: string; hasTime?: boolean } {
  if (!v) return {};
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? {} : { dueDate: d.toISOString() };
  }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return {};
  const [, y, mo, d, h, mi] = m;
  if (h !== undefined) {
    return { dueDate: new Date(+y, +mo - 1, +d, +h, +mi).toISOString(), hasTime: true };
  }
  return { dueDate: new Date(+y, +mo - 1, +d, 12, 0).toISOString(), hasTime: false };
}

function normalizeSuggested(tasks?: SuggestedTask[]): SuggestedTask[] | undefined {
  return tasks?.map((t) => {
    const d = localToIso(t.dueDate);
    return { ...t, dueDate: d.dueDate, hasTime: d.dueDate ? (t.hasTime ?? d.hasTime) : undefined };
  });
}

function normalize<A extends AiAction>(action: A, data: AiResponseMap[A]): AiResponseMap[A] {
  if (action === "parse") {
    const p = data as AiResponseMap["parse"];
    const d = localToIso(p.dueDate);
    return { ...p, dueDate: d.dueDate, hasTime: d.dueDate ? (p.hasTime ?? d.hasTime) : undefined } as AiResponseMap[A];
  }
  if (action === "breakdown" || action === "assistant") {
    const p = data as AiResponseMap["breakdown"] | AiResponseMap["assistant"];
    return { ...p, tasks: normalizeSuggested(p.tasks) } as AiResponseMap[A];
  }
  return data;
}

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<A extends AiAction>(
  action: A,
  livePayload: AiRequestMap[A],
  demoPayload: AiRequestMap[A],
): Promise<AiResult<A>> {
  const status = await getAiStatus();

  if (status.mode === "demo") {
    // A short, natural delay so results don't feel canned.
    await wait(450 + Math.random() * 450);
    return { data: normalize(action, runDemo(action, demoPayload)), mode: "demo" };
  }

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload: livePayload }),
      signal: AbortSignal.timeout(30_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return { data: normalize(action, json.data), mode: json.mode ?? "live" };
  } catch (err) {
    return {
      data: normalize(action, runDemo(action, demoPayload)),
      mode: "demo",
      fallback: true,
      error: err instanceof Error ? err.message : "AI request failed",
    };
  }
}

/* ------------------------------ public API ------------------------------ */

export const ai = {
  breakdown(goal: string) {
    const now = new Date();
    return request(
      "breakdown",
      { goal, now: localNaive(now) },
      { goal, now: now.toISOString() },
    );
  },

  enhance(title: string, notes?: string) {
    return request("enhance", { title, notes }, { title, notes });
  },

  parse(text: string) {
    const now = new Date();
    return request(
      "parse",
      { text, now: localNaive(now), timezone: tz() },
      { text, now: now.toISOString(), timezone: tz() },
    );
  },

  assistant(message: string, tasks: Task[], history: { role: "user" | "assistant"; content: string }[] = []) {
    const now = new Date();
    const ctx = toContext(tasks);
    return request(
      "assistant",
      {
        message,
        now: localNaive(now),
        timezone: tz(),
        history,
        tasks: ctx.map((t) => ({ ...t, dueDate: t.dueDate ? localNaive(new Date(t.dueDate)) : undefined })),
      },
      { message, now: now.toISOString(), timezone: tz(), tasks: ctx, history },
    );
  },
};
