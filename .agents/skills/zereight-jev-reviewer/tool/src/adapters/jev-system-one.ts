// Real Jev (typesafe/jev-1.13) through OpenRouter's System One API (JEV_PROVIDER=jev, default).
// Uses the official TypeSafe SDK pointed at OpenRouter: https://openrouter.ai/api/v1/systemone.
// Probabilities come from the Jev model itself; no prompting or parsing happens here.
import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { Questions, SystemOneRequest, SystemOneResult } from "@typesafe-ai/sdk";
import { recordRoutedModel, type SystemOneClient } from "./system-one.ts";

const DEFAULT_MODEL = "jev-1.13";
const DEFAULT_BASE_URL = "https://openrouter.ai/api";

export class JevSystemOneClient implements SystemOneClient {
  readonly model = process.env.JEV_MODEL ?? DEFAULT_MODEL;
  #client: TypeSafeClient | undefined;

  async systemOne<Q extends Questions>(request: SystemOneRequest<Q>): Promise<SystemOneResult<Q>> {
    const result = await this.#clientOrThrow().systemOne({ ...request, model: request.model ?? this.model });
    recordRoutedModel(result.model);
    return result;
  }

  #clientOrThrow(): TypeSafeClient {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set (JEV_PROVIDER=jev)");
    this.#client ??= new TypeSafeClient({ apiKey, baseURL: process.env.JEV_BASE_URL ?? DEFAULT_BASE_URL });
    return this.#client;
  }
}
