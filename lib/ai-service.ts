import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getAIServiceConfig } from "./env-config";

interface AISettings {
  provider: "openai" | "gemini" | "openai-compatible" | "";
  apiKey: string;
  model: string;
  endpoint?: string;
}

export class AIService {
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  private getModel() {
    if (
      !this.settings.provider || !this.settings.apiKey || !this.settings.model
    ) {
      throw new Error("AI service not properly configured");
    }

    switch (this.settings.provider) {
      case "openai": {
        // 为 OpenAI 创建自定义实例
        const customOpenAI = createOpenAI({
          apiKey: this.settings.apiKey,
        });
        return customOpenAI(this.settings.model);
      }
      case "gemini": {
        // 为 Google Gemini 创建自定义实例
        const customGoogle = createGoogleGenerativeAI({
          apiKey: this.settings.apiKey,
        });
        return customGoogle(this.settings.model);
      }
      case "openai-compatible": {
        if (!this.settings.endpoint) {
          throw new Error(
            "Endpoint is required for OpenAI-compatible providers",
          );
        }
        // 为 OpenAI 兼容的 API 创建专用实例
        const compatibleProvider = createOpenAICompatible({
          name: "openai-compatible",
          apiKey: this.settings.apiKey,
          baseURL: this.settings.endpoint,
        });
        return compatibleProvider(this.settings.model);
      }
      default:
        throw new Error(`Unsupported AI provider: ${this.settings.provider}`);
    }
  }

  async optimizeRules(rules: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI service not configured");
    }

    const prompt =
      `你是一个 CLASH 规则优化专家。请分析以下 CLASH 规则并进行优化：

优化要求：
1. 移除重复的规则
2. 合并相似的规则（如果可能）
3. 添加有用的注释来解释规则组
4. 优化规则顺序以提高性能（更具体的规则在前）
5. 修复任何语法错误
6. 确保最终的 MATCH 规则在最后
7. 按类型分组规则（域名规则、IP 规则、进程规则等）
8. 添加性能优化建议的注释

当前规则：
${rules}

请返回优化后的规则，保持相同的格式，并添加中文注释说明。`;

    try {
      const { text } = await generateText({
        model: this.getModel(),
        prompt,
        // maxTokens: 3000,
        temperature: 0.3,
      });

      return text;
    } catch (error) {
      console.error("AI optimization failed:", error);
      throw new Error(
        `AI 优化失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  async explainRule(rule: string, matchContext: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI service not configured");
    }

    const prompt =
      `你是一个 CLASH 规则专家。请用简单易懂的中文解释以下 CLASH 规则：

规则：${rule}
匹配上下文：${matchContext}

请详细解释：
1. 这个规则的作用是什么
2. 什么情况下会匹配这个规则
3. 匹配后会执行什么动作
4. 有什么重要的注意事项
5. 这个规则在整个配置中的作用

请用通俗易懂的语言解释，适合初学者和高级用户。`;

    try {
      console.log("AI Service - Starting explanation with settings:", {
        provider: this.settings.provider,
        model: this.settings.model,
        hasApiKey: !!this.settings.apiKey,
        hasEndpoint: !!this.settings.endpoint,
      });

      const model = this.getModel();
      console.log("AI Service - Model created successfully");

      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.2,
      });

      console.log("AI Service - Text generated successfully");
      return text;
    } catch (error) {
      console.error("AI explanation failed:", error);
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new Error(
        `AI 解释失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  async generateRuleSuggestions(
    domain: string,
    ip?: string,
    purpose?: string,
  ): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error("AI service not configured");
    }

    const prompt = `作为 CLASH 规则专家，请为以下场景生成合适的规则建议：

域名：${domain}
${ip ? `IP: ${ip}` : ""}
${purpose ? `用途: ${purpose}` : ""}

请生成 3-5 个不同类型的规则建议，包括：
1. 域名相关规则（DOMAIN, DOMAIN-SUFFIX, DOMAIN-KEYWORD）
2. 如果有 IP，生成 IP 相关规则
3. 考虑不同的策略（DIRECT, PROXY, REJECT）
4. 每个规则后面用 # 添加简短的中文说明

只返回规则列表，每行一个规则。`;

    try {
      const { text } = await generateText({
        model: this.getModel(),
        prompt,
        // maxTokens: 600,
        temperature: 0.4,
      });

      return text.split("\n").filter((line) =>
        line.trim() && !line.startsWith("#")
      );
    } catch (error) {
      console.error("AI rule generation failed:", error);
      throw new Error(
        `AI 规则生成失败：${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  async analyzeRulePerformance(rules: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI service not configured");
    }

    const prompt = `作为 CLASH 规则性能分析专家，请分析以下规则配置的性能：

${rules}

请提供：
1. 性能评估（优秀/良好/一般/需要优化）
2. 潜在的性能问题
3. 优化建议
4. 规则数量和复杂度分析
5. 建议的规则顺序调整

请用中文回答，提供具体可行的建议。`;

    try {
      const { text } = await generateText({
        model: this.getModel(),
        prompt,
        // maxTokens: 1000,
        temperature: 0.3,
      });

      return text;
    } catch (error) {
      console.error("AI performance analysis failed:", error);
      throw new Error(
        `AI 性能分析失败：${
          error instanceof Error ? error.message : "未知错误"
        }`,
      );
    }
  }

  isConfigured(): boolean {
    const hasBasicConfig =
      !!(this.settings.provider && this.settings.apiKey && this.settings.model);

    if (this.settings.provider === "openai-compatible") {
      return hasBasicConfig && !!this.settings.endpoint;
    }

    return hasBasicConfig;
  }

  getProviderName(): string {
    switch (this.settings.provider) {
      case "openai":
        return "OpenAI";
      case "gemini":
        return "Google Gemini";
      case "openai-compatible":
        return "OpenAI Compatible";
      default:
        return "未配置";
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "AI service not configured",
      };
    }

    try {
      console.log("Testing AI connection with settings:", {
        provider: this.settings.provider,
        model: this.settings.model,
        hasApiKey: !!this.settings.apiKey,
        hasEndpoint: !!this.settings.endpoint,
      });

      const model = this.getModel();
      console.log("Model created successfully for testing");

      // 发送一个简单的测试请求
      const { text } = await generateText({
        model,
        prompt: "Hello",
        temperature: 0,
      });

      console.log("Test request successful, response:", text?.slice(0, 50));

      return {
        success: true,
      };
    } catch (error) {
      console.error("Connection test failed:", error);

      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
