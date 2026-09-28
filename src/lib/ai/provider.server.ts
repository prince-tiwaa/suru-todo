import "server-only";

/**
 * Thin provider layer. Uses plain fetch so there are no SDK dependencies,
 * and so switching providers is a matter of environment variables:
 *
 *   ANTHROPIC_API_KEY  → Anthropic Messages API   (preferred if both set)
 *   OPENAI_API_KEY     → OpenAI Chat Completions  (or any compatible API via OPENAI_BASE_URL)
 *   AI_MODEL           → optional model override
 *
 * With no key configured Suru runs in demo mode (see fallback.ts).
 */

export type ProviderId = "anthropic" | "openai";

export interface ProviderConfig {
  provider: ProviderId;
  model: string;
}

export function getProviderConfig(): ProviderConfig | null {
  if (process.env.AI_DISABLED === "true") return null;
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", model: process.env.AI_MODEL || "claude-haiku-4-5" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", model: process.env.AI_MODEL || "gpt-4o-mini" };
  }
  return null;
}

const TIMEOUT_MS = 25_000;

export async function complete(system: string, user: string, cfg: ProviderConfig): Promise<string> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  if (cfg.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1200,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new ProviderError(res.status, await safeText(res));
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (json.content ?? []).map((c) => c.text ?? "").join("");
  }

  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new ProviderError(res.status, await safeText(res));
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

export class ProviderError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`AI provider responded ${status}: ${body.slice(0, 200)}`);
  }
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
