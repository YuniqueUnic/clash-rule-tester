import "server-only";

import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AISettings } from "@/lib/ai/types";
import { validateOpenAICompatibleEndpoint } from "@/lib/server/ai/endpoint-safety";

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

function getTemperature(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.3;
  return Math.max(0, Math.min(2, value));
}

function createModel(settings: AISettings) {
  switch (settings.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: settings.apiKey });
      return openai(settings.model);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI({ apiKey: settings.apiKey });
      return google(settings.model);
    }
    case "openai-compatible": {
      const endpointCheck = validateOpenAICompatibleEndpoint(
        settings.endpoint ?? "",
      );
      if (!endpointCheck.ok) {
        throw new Error(endpointCheck.error);
      }
      const compatible = createOpenAICompatible({
        name: "openai-compatible",
        apiKey: settings.apiKey,
        baseURL: endpointCheck.endpoint,
      });
      return compatible(settings.model);
    }
    default:
      throw new Error("Unsupported provider");
  }
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

  const { settings, prompt, temperature } = body as {
    settings?: Partial<AISettings>;
    prompt?: unknown;
    temperature?: unknown;
  };

  if (!isNonEmptyString(prompt)) {
    return NextResponse.json({ error: "prompt 不能为空" }, { status: 400 });
  }

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "settings 不合法" }, { status: 400 });
  }

  if (!isValidProvider(settings.provider)) {
    return NextResponse.json({ error: "provider 不合法" }, { status: 400 });
  }

  if (!isNonEmptyString(settings.apiKey)) {
    return NextResponse.json({ error: "apiKey 不能为空" }, { status: 400 });
  }

  if (!isNonEmptyString(settings.model)) {
    return NextResponse.json({ error: "model 不能为空" }, { status: 400 });
  }

  if (settings.provider === "openai-compatible" && !isNonEmptyString(settings.endpoint)) {
    return NextResponse.json(
      { error: "openai-compatible 需要填写 endpoint" },
      { status: 400 },
    );
  }

  try {
    const model = createModel(settings as AISettings);
    const { text } = await generateText({
      model,
      prompt,
      temperature: getTemperature(temperature),
      abortSignal: request.signal,
    });

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

