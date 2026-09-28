import { NextResponse } from "next/server";
import type { AiAction, AiRequestMap } from "@/lib/types";
import { buildPrompt } from "@/lib/ai/prompts";
import { coerce, extractJson } from "@/lib/ai/validate";
import { complete, getProviderConfig, ProviderError } from "@/lib/ai/provider.server";
import { runDemo } from "@/lib/ai/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: AiAction[] = ["breakdown", "enhance", "parse", "assistant"];

/* Simple per-instance rate limit to protect the API key from abuse. */
const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 30);
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

/** GET /api/ai → which mode the server is running in. Never exposes keys. */
export async function GET() {
  const cfg = getProviderConfig();
  return NextResponse.json({
    mode: cfg ? "live" : "demo",
    provider: cfg?.provider ?? null,
    model: cfg?.model ?? null,
  });
}

/** POST /api/ai  { action, payload } → { data, mode, provider } */
export async function POST(req: Request) {
  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action as AiAction;
  if (!ACTIONS.includes(action) || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "Unknown action or missing payload" }, { status: 400 });
  }

  const payload = sanitize(action, body.payload as Record<string, unknown>);
  if (!payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const cfg = getProviderConfig();
  if (!cfg) {
    return NextResponse.json({ data: runDemo(action, payload), mode: "demo" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many AI requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const { system, user } = buildPrompt(action, payload);
    const text = await complete(system, user, cfg);
    const data = coerce(action, extractJson(text));
    return NextResponse.json({ data, mode: "live", provider: cfg.provider });
  } catch (err) {
    const status = err instanceof ProviderError ? err.status : 500;
    console.error("[suru/ai]", action, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: status === 401 ? "AI provider rejected the API key." : "The AI request failed." },
      { status: status === 401 || status === 429 ? status : 502 },
    );
  }
}

/* ------------------------------ helpers ------------------------------ */

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function sanitize(action: AiAction, p: Record<string, unknown>): AiRequestMap[typeof action] | null {
  const now = s(p.now, 80) || new Date().toISOString();
  switch (action) {
    case "breakdown": {
      const goal = s(p.goal, 500).trim();
      return goal ? { goal, now } : null;
    }
    case "enhance": {
      const title = s(p.title, 300).trim();
      return title ? { title, notes: s(p.notes, 1000) || undefined } : null;
    }
    case "parse": {
      const text = s(p.text, 500).trim();
      return text ? { text, now, timezone: s(p.timezone, 60) || "UTC" } : null;
    }
    case "assistant": {
      const message = s(p.message, 4000).trim();
      if (!message) return null;
      const tasks = Array.isArray(p.tasks) ? p.tasks.slice(0, 100) : [];
      const history = Array.isArray(p.history)
        ? p.history
            .filter((h): h is { role: "user" | "assistant"; content: string } =>
              !!h && typeof h === "object" && (h.role === "user" || h.role === "assistant") && typeof h.content === "string",
            )
            .slice(-6)
        : undefined;
      return { message, now, timezone: s(p.timezone, 60) || "UTC", tasks, history } as AiRequestMap["assistant"];
    }
  }
}
