import "server-only";

import { NextResponse } from "next/server";
import type { AISettings } from "@/lib/ai/types";
import {
  normalizeBaseUrl,
  validateOpenAICompatibleEndpoint,
} from "@/lib/server/ai/endpoint-safety";

export const runtime = "nodejs";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidProvider(
  provider: unknown,
): provider is Exclude<AISettings["provider"], ""> {
  return provider === "openai" || provider === "gemini" ||
    provider === "openai-compatible";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法的 JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求体不合法" }, { status: 400 });
  }

  const { settings } = body as { settings?: Partial<AISettings> };

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "settings 不合法" }, { status: 400 });
  }

  if (!isValidProvider(settings.provider)) {
    return NextResponse.json({ error: "provider 不合法" }, { status: 400 });
  }

  if (!isNonEmptyString(settings.apiKey)) {
    return NextResponse.json({ error: "apiKey 不能为空" }, { status: 400 });
  }

  try {
    switch (settings.provider) {
      case "openai": {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
          },
          signal: request.signal,
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `HTTP ${response.status}: ${response.statusText}` },
            { status: 502 },
          );
        }

        const data = await response.json();
        const models = (data.data as Array<{ id?: string }> | undefined)?.map(
          (model) => model.id,
        ).filter((id): id is string => typeof id === "string") ?? [];

        return NextResponse.json({
          models: models.filter((id) =>
            id.includes("gpt") || id.includes("text") || id.includes("davinci")
          ),
        });
      }

      case "gemini": {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${settings.apiKey}`,
          { signal: request.signal },
        );

        if (!response.ok) {
          return NextResponse.json(
            { error: `HTTP ${response.status}: ${response.statusText}` },
            { status: 502 },
          );
        }

        const data = await response.json();
        const models = (
          data.models as Array<{ name?: string }> | undefined
        )?.map((model) => model.name?.replace("models/", "")).filter(
          (name): name is string => typeof name === "string",
        ) ?? [];

        return NextResponse.json({
          models: models.filter((name) => name.includes("gemini")),
        });
      }

      case "openai-compatible": {
        if (!isNonEmptyString(settings.endpoint)) {
          return NextResponse.json(
            { error: "openai-compatible 需要填写 endpoint" },
            { status: 400 },
          );
        }

        const endpointCheck = validateOpenAICompatibleEndpoint(settings.endpoint);
        if (!endpointCheck.ok) {
          return NextResponse.json({ error: endpointCheck.error }, { status: 400 });
        }

        const modelsUrl = `${normalizeBaseUrl(endpointCheck.endpoint)}/models`;
        const response = await fetch(modelsUrl, {
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
          },
          signal: request.signal,
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `HTTP ${response.status}: ${response.statusText}` },
            { status: 502 },
          );
        }

        const data = await response.json();
        const models = (data.data as Array<{ id?: string }> | undefined)?.map(
          (model) => model.id,
        ).filter((id): id is string => typeof id === "string") ?? [];

        return NextResponse.json({ models });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

