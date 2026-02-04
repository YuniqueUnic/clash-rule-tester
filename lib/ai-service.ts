import type { AISettings } from "@/lib/ai/types";

export class AIService {
  private settings: AISettings;

  // 用于取消正在进行的请求
  private abortController: AbortController | null = null;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  /**
   * 取消当前正在进行的 AI 请求
   */
  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 检查是否有正在进行的请求
   */
  isRequestInProgress(): boolean {
    return this.abortController !== null;
  }

  private async postJson<TResponse>(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<TResponse> {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });

    const data = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!response.ok) {
      const message =
        data && typeof data.error === "string"
          ? data.error
          : `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    if (!data) {
      throw new Error("服务端响应不是有效的 JSON");
    }

    return data as TResponse;
  }

  private async generateTextViaApi(
    prompt: string,
    temperature: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const data = await this.postJson<{ text: string }>(
      "/api/ai/generate",
      {
        settings: this.settings,
        prompt,
        temperature,
      },
      signal,
    );

    return data.text ?? "";
  }

  async optimizeRules(rules: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI service not configured");
    }

    // 取消之前的请求（如果有）
    this.cancelCurrentRequest();

    // 创建新的 AbortController
    this.abortController = new AbortController();

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

重要格式要求：
- 注释必须单独成行，以 # 开头
- 规则行不能包含行内注释（即规则后面不能有 # 注释）
- 每个规则必须严格按照 "规则类型，规则值，策略" 的格式
- 不要在规则行末尾添加任何额外的文字或注释

正确格式示例：
# 这是注释行
DOMAIN-SUFFIX,google.com,PROXY

错误格式示例（不要这样写）：
DOMAIN-SUFFIX,google.com,PROXY  # 这是错误的行内注释

当前规则：
${rules}

请返回优化后的规则，严格遵循上述格式要求。`;

    try {
      const text = await this.generateTextViaApi(
        prompt,
        0.3,
        this.abortController.signal,
      );

      // 请求成功完成，清除 AbortController
      this.abortController = null;
      return text;
    } catch (error) {
      // 清除 AbortController
      this.abortController = null;

      // 检查是否是取消错误
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI 优化已被用户取消");
      }

      console.error("AI optimization failed:", error);
      throw new Error(
        `AI 优化失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  async explainRule(
    rule: string,
    matchContext: string,
    testRequest?: any,
    matchResult?: any,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI service not configured");
    }

    // 构建增强的提示词
    let prompt =
      `你是一个 CLASH 规则专家。请用简单易懂的中文解释以下 CLASH 规则：

规则：${rule}
匹配上下文：${matchContext}`;

    // 添加测试请求信息
    if (testRequest) {
      prompt += `

测试请求信息：`;
      if (testRequest.domain) prompt += `\n- 域名：${testRequest.domain}`;
      if (testRequest.srcIPv4) prompt += `\n- 源 IPv4：${testRequest.srcIPv4}`;
      if (testRequest.srcIPv6) prompt += `\n- 源 IPv6：${testRequest.srcIPv6}`;
      if (testRequest.srcPort) prompt += `\n- 源端口：${testRequest.srcPort}`;
      if (testRequest.dstIPv4) {
        prompt += `\n- 目标 IPv4：${testRequest.dstIPv4}`;
      }
      if (testRequest.dstIPv6) {
        prompt += `\n- 目标 IPv6：${testRequest.dstIPv6}`;
      }
      if (testRequest.dstPort) prompt += `\n- 目标端口：${testRequest.dstPort}`;
      if (testRequest.process) prompt += `\n- 进程名：${testRequest.process}`;
      if (testRequest.processPath) {
        prompt += `\n- 进程路径：${testRequest.processPath}`;
      }
      if (testRequest.geoIP) prompt += `\n- 地理位置：${testRequest.geoIP}`;
      if (testRequest.network) prompt += `\n- 网络类型：${testRequest.network}`;
      if (testRequest.uid) prompt += `\n- 用户 ID：${testRequest.uid}`;
    }

    // 添加匹配结果信息
    if (matchResult) {
      prompt += `

匹配结果：
- 规则类型：${matchResult.ruleType}
- 策略：${matchResult.policy}
- 匹配内容：${matchResult.matchedContent}
- 行号：${matchResult.lineNumber}`;
      if (matchResult.matchRange) {
        prompt += `\n- 匹配范围：${matchResult.matchRange}`;
      }
      if (matchResult.matchPosition) {
        prompt += `\n- 匹配位置：${matchResult.matchPosition}`;
      }
    }

    prompt += `

请详细解释：
1. 这个规则的作用是什么
2. 为什么这个测试请求会匹配到这个规则
3. 匹配后会执行什么动作
4. 这个规则的匹配逻辑和条件
5. 有什么重要的注意事项
6. 这个规则在整个配置中的作用和位置

请用通俗易懂的语言解释，结合具体的测试场景，适合初学者和高级用户。`;

    try {
      const text = await this.generateTextViaApi(prompt, 0.2);
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
      const text = await this.generateTextViaApi(prompt, 0.4);

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
      const text = await this.generateTextViaApi(prompt, 0.3);

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

  async getAvailableModels(): Promise<
    { success: boolean; models?: string[]; error?: string }
  > {
    if (!this.settings.provider || !this.settings.apiKey) {
      return {
        success: false,
        error: "Provider and API key are required",
      };
    }

    try {
      const data = await this.postJson<{ models: string[] }>(
        "/api/ai/models",
        {
          settings: {
            provider: this.settings.provider,
            apiKey: this.settings.apiKey,
            endpoint: this.settings.endpoint,
          },
        },
      );

      return {
        success: true,
        models: data.models ?? [],
      };
    } catch (error) {
      console.error("Failed to fetch models:", error);

      const errorMessage = error instanceof Error ? error.message : "未知错误";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    // 使用模型列表获取来测试连接
    const result = await this.getAvailableModels();

    if (result.success) {
      console.log(
        "Connection test successful, found models:",
        result.models?.length,
      );
      return {
        success: true,
      };
    } else {
      console.error("Connection test failed:", result.error);
      return {
        success: false,
        error: result.error,
      };
    }
  }
}
