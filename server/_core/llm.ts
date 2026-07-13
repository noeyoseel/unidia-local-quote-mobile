import { ENV } from "./env";

export type TextContent = { type: "text"; text: string };

export type ImageContent = {
  type: "image_url";
  image_url: { url: string };
};

export type MessageContent = string | TextContent | ImageContent;

export type Message = {
  role: "system" | "user" | "assistant";
  content: MessageContent | MessageContent[];
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

export type InvokeParams = {
  model: string;
  messages: Message[];
  maxTokens: number;
  responseFormat?: { type: "json_schema"; json_schema: JsonSchema };
};

export type InvokeResult = {
  /** JSON string when responseFormat was json_schema, otherwise plain text. */
  content: string;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const assertApiKey = () => {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
};

function parseDataUrl(url: string): { mediaType: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (!match) {
    throw new Error("Expected a base64 data URL for image content");
  }
  return { mediaType: match[1], base64: match[2] };
}

function toAnthropicContentBlocks(content: MessageContent | MessageContent[]) {
  const parts = Array.isArray(content) ? content : [content];
  return parts.map((part) => {
    if (typeof part === "string") {
      return { type: "text" as const, text: part };
    }
    if (part.type === "text") {
      return { type: "text" as const, text: part.text };
    }
    const { mediaType, base64 } = parseDataUrl(part.image_url.url);
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: mediaType, data: base64 },
    };
  });
}

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum delay so a
// misbehaving caller loop slows down instead of hammering the upstream while it keeps
// returning errors.
const computeBackoffDelay = (attempt: number, retryAfterMs?: number): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

const fetchWithBackoff = async (url: string, init: NonNullable<Parameters<typeof fetch>[1]>) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(`LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`);
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(`LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`);
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};

/**
 * Calls Claude via the Anthropic Messages API. When `responseFormat` is a
 * json_schema, forces structured output via tool use (Anthropic has no
 * native response_format param) so callers get back a parseable JSON string.
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const systemMessages = params.messages.filter((m) => m.role === "system");
  const conversationMessages = params.messages.filter((m) => m.role !== "system");

  const payload: Record<string, unknown> = {
    model: params.model,
    max_tokens: params.maxTokens,
    system: systemMessages
      .map((m) => (typeof m.content === "string" ? m.content : toAnthropicContentBlocks(m.content).map((b) => ("text" in b ? b.text : "")).join("\n")))
      .join("\n") || undefined,
    messages: conversationMessages.map((m) => ({
      role: m.role,
      content: toAnthropicContentBlocks(m.content),
    })),
  };

  if (params.responseFormat?.type === "json_schema") {
    const { name, schema } = params.responseFormat.json_schema;
    payload.tools = [{ name, description: `Return the extracted data as ${name}.`, input_schema: schema }];
    payload.tool_choice = { type: "tool", name };
  }

  const response = await fetchWithBackoff(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ENV.anthropicApiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string; input?: unknown }>;
  };

  if (params.responseFormat?.type === "json_schema") {
    const toolUse = data.content.find((block) => block.type === "tool_use");
    if (!toolUse) {
      throw new Error("Expected a tool_use block in the Claude response but found none");
    }
    return { content: JSON.stringify(toolUse.input) };
  }

  const text = data.content.find((block) => block.type === "text")?.text;
  if (typeof text !== "string") {
    throw new Error("Expected a text block in the Claude response but found none");
  }
  return { content: text };
}
