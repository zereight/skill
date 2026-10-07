// OpenRouter stand-in for TypeSafe's `systemOne` endpoint. Keeps the SDK's
// question builders (`noul`, `choice`, `score`) and answer shapes, but sends
// one structured chat completion per request. Yes/no probabilities come from
// answer-token logprobs when the routed provider returns them; otherwise the
// model's stated probability is used.
import type {
  ChoiceResponse,
  NoulResponse,
  Question,
  Questions,
  ScoreResponse,
  SystemOneRequest,
  SystemOneResult,
} from "@typesafe-ai/sdk";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "typesafe/jev-router";
const DEFAULT_MAX_TOKENS = 6000;
const MAX_ATTEMPTS = 3;
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const SYSTEM_PROMPT = [
  "You are a calibrated code-review judge.",
  "Answer every question using only the supplied state.",
  "For yes/no questions, `answer` is true when the `true` criterion applies.",
  "Probabilities are your calibrated beliefs from 0 to 1, not certainty theatre.",
  "Every distribution must cover each label and sum to 1.",
].join(" ");

type Logprob = { token: string; logprob: number; top_logprobs?: { token: string; logprob: number }[] };
type Completion = {
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  choices?: { message?: { content?: string | null }; logprobs?: { content?: Logprob[] | null } | null }[];
  error?: { message?: string };
};
type RawAnswer = { answer?: boolean; p_yes?: number; label?: string; score?: number; probabilities?: Record<string, number> };

const routedModels = new Map<string, number>();

/** Routed model counts for this process, e.g. to log after a review. */
export function routedModelSummary(): string {
  return [...routedModels].map(([model, count]) => model + " x" + count).join(", ") || "none";
}

export class OpenRouterSystemOneClient {
  readonly model = process.env.JEV_MODEL ?? DEFAULT_MODEL;
  readonly #apiKey = process.env.OPENROUTER_API_KEY;
  readonly #maxTokens = Number(process.env.JEV_MAX_TOKENS ?? DEFAULT_MAX_TOKENS);
  readonly #reasoningEffort = process.env.JEV_REASONING_EFFORT;

  async systemOne<Q extends Questions>(request: SystemOneRequest<Q>): Promise<SystemOneResult<Q>> {
    if (!this.#apiKey) throw new Error("OPENROUTER_API_KEY is not set");
    const names = Object.keys(request.questions);
    const body = {
      model: request.model ?? this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ state: request.state, questions: request.questions }),
        },
      ],
      max_tokens: this.#maxTokens,
      logprobs: true,
      top_logprobs: 5,
      ...(this.#reasoningEffort ? { reasoning: { effort: this.#reasoningEffort } } : {}),
      // Route only to providers that honor response_format.
      provider: { require_parameters: true },
      response_format: {
        type: "json_schema",
        json_schema: { name: "system_one_answers", strict: true, schema: answersSchema(request.questions) },
      },
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const completion = await postAsync(this.#apiKey, body);
        const message = completion.choices?.[0];
        const content = message?.message?.content;
        if (!content) throw new Error("Empty completion (raise JEV_MAX_TOKENS if reasoning consumed the budget)");
        const raw = parseAnswers(content);
        const tokenProbabilities = noulProbabilitiesFromLogprobs(message?.logprobs?.content ?? []);

        const answers: Record<string, unknown> = {};
        for (const name of names) {
          answers[name] = toAnswer(request.questions[name], raw[name], tokenProbabilities.get(name));
        }
        const model = completion.model ?? body.model;
        routedModels.set(model, (routedModels.get(model) ?? 0) + 1);
        return {
          model,
          answers: answers as SystemOneResult<Q>["answers"],
          usage: {
            input_tokens: completion.usage?.prompt_tokens ?? 0,
            output_tokens: completion.usage?.completion_tokens ?? 0,
          },
        };
      } catch (error) {
        lastError = error;
        if (error instanceof HttpError && !RETRY_STATUSES.has(error.status)) break;
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
    throw lastError;
  }
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function postAsync(apiKey: string, body: unknown): Promise<Completion> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "X-Title": "zereight-jev-reviewer",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });
  const json = (await response.json().catch(() => ({}))) as Completion;
  if (!response.ok || json.error) {
    throw new HttpError(response.status, "OpenRouter " + response.status + ": " + (json.error?.message ?? response.statusText));
  }
  return json;
}

// Some routed providers prepend reasoning text to the JSON body.
function parseAnswers(content: string): Record<string, RawAnswer> {
  try {
    return JSON.parse(content) as Record<string, RawAnswer>;
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Completion is not JSON: " + content.slice(0, 120));
    return JSON.parse(content.slice(start, end + 1)) as Record<string, RawAnswer>;
  }
}

function answersSchema(questions: Questions) {
  const properties: Record<string, unknown> = {};
  for (const [name, question] of Object.entries(questions)) {
    properties[name] = questionSchema(question);
  }
  return { type: "object", properties, required: Object.keys(questions), additionalProperties: false };
}

function questionSchema(question: Question) {
  if (question.type === "noul") {
    // `answer` comes first so its token logprob is read before the stated probability.
    return {
      type: "object",
      properties: { answer: { type: "boolean" }, p_yes: { type: "number" } },
      required: ["answer", "p_yes"],
      additionalProperties: false,
    };
  }
  const labels = question.type === "choice"
    ? Object.keys(question.criteria)
    : question.criteria.map((_, index) => String(index));
  const distribution = {
    type: "object",
    properties: Object.fromEntries(labels.map((label) => [label, { type: "number" }])),
    required: labels,
    additionalProperties: false,
  };
  const pick = question.type === "choice"
    ? { label: { type: "string", enum: labels } }
    : { score: { type: "integer", enum: labels.map(Number) } };
  return {
    type: "object",
    properties: { ...pick, probabilities: distribution },
    required: [...Object.keys(pick), "probabilities"],
    additionalProperties: false,
  };
}

function toAnswer(question: Question, raw: RawAnswer | undefined, tokenProbability: number | undefined) {
  if (!raw) throw new Error("Missing answer in structured output");
  if (question.type === "noul") {
    const stated = clamp(raw.p_yes ?? (raw.answer ? 1 : 0));
    return { type: "noul", noul: tokenProbability ?? stated } satisfies NoulResponse;
  }
  if (question.type === "choice") {
    const labels = Object.keys(question.criteria);
    const probabilities = normalize(labels, raw.probabilities, raw.label);
    const choice = raw.label && labels.includes(raw.label) ? raw.label : argmax(probabilities);
    return {
      type: "choice",
      choice,
      confidence: probabilities[choice],
      probabilities,
    } satisfies ChoiceResponse;
  }
  const labels = question.criteria.map((_, index) => String(index));
  const probabilities = normalize(labels, raw.probabilities, raw.score === undefined ? undefined : String(raw.score));
  const expected = labels.reduce((sum, label) => sum + Number(label) * probabilities[label], 0);
  return {
    type: "score",
    score: expected,
    confidence: Math.max(...Object.values(probabilities)),
    legend: Object.fromEntries(question.criteria.map((description, index) => [String(index), description])),
    probabilities,
  } satisfies ScoreResponse;
}

// Reads P(true) for each noul `answer` token: the tokens right after
// `"<name>": { "answer":` are compared through their top logprobs.
function noulProbabilitiesFromLogprobs(tokens: Logprob[]): Map<string, number> {
  const result = new Map<string, number>();
  let prefix = "";
  for (const token of tokens) {
    const match = /"([^"]+)"\s*:\s*\{\s*"answer"\s*:\s*$/.exec(prefix.slice(-400));
    const value = token.token.trim();
    if (match && (value.startsWith("t") || value.startsWith("f"))) {
      let yes = 0;
      let no = 0;
      for (const candidate of token.top_logprobs ?? [token]) {
        const text = candidate.token.trim();
        if (text.startsWith("t")) yes += Math.exp(candidate.logprob);
        else if (text.startsWith("f")) no += Math.exp(candidate.logprob);
      }
      if (yes + no > 0) result.set(match[1], yes / (yes + no));
    }
    prefix += token.token;
  }
  return result;
}

function normalize(labels: string[], raw: Record<string, number> | undefined, picked: string | undefined) {
  const values = labels.map((label) => Math.max(0, Number(raw?.[label] ?? 0)));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Object.fromEntries(labels.map((label) => [label, picked === undefined ? 1 / labels.length : label === picked ? 1 : 0]));
  }
  return Object.fromEntries(labels.map((label, index) => [label, values[index] / total]));
}

function argmax(probabilities: Record<string, number>): string {
  return Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
