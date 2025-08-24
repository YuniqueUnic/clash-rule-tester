/**
 * Clash 规则导入导出工具
 * 支持多种格式和选项的规则导入导出功能
 */

export interface ExportOptions {
  removeComments: boolean; // 去除注释
  addQuotes: boolean; // 添加引号包裹
  addPrefix: boolean; // 添加前缀 "  - "
  filename?: string; // 自定义文件名
}

export interface ImportOptions {
  removeQuotes: boolean; // 移除引号
  removePrefix: boolean; // 移除前缀 "  - "
  preserveComments: boolean; // 保留注释
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  removeComments: true,
  addQuotes: true,
  addPrefix: false,
};

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  removeQuotes: true,
  removePrefix: true,
  preserveComments: true,
};

/**
 * 导出规则到文件
 * @param content 规则内容
 * @param options 导出选项
 */
export function exportRules(
  content: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): void {
  const lines = content.split("\n");
  let processedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 处理空行
    if (!trimmed) {
      if (!options.removeComments) {
        processedLines.push("");
      }
      continue;
    }

    // 处理注释行
    if (trimmed.startsWith("#")) {
      if (!options.removeComments) {
        processedLines.push(trimmed);
      }
      continue;
    }

    // 处理规则行
    let processedLine = trimmed;

    // 添加引号
    if (options.addQuotes) {
      processedLine = `"${processedLine}"`;
    }

    // 添加前缀
    if (options.addPrefix) {
      processedLine = `  - ${processedLine}`;
    }

    processedLines.push(processedLine);
  }

  // 生成文件内容
  const exportContent = processedLines.join("\n");

  // 创建并下载文件
  const blob = new Blob([exportContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // 生成文件名
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = options.filename || `clash-rules-${timestamp}.txt`;

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 清理 URL 对象
  URL.revokeObjectURL(url);
}

/**
 * 处理导入的规则内容
 * @param content 原始内容
 * @param options 导入选项
 * @returns 处理后的内容
 */
export function processImportedRules(
  content: string,
  options: ImportOptions = DEFAULT_IMPORT_OPTIONS,
): string {
  const lines = content.split("\n");
  const processedLines: string[] = [];

  for (const line of lines) {
    let processedLine = line;

    // 处理空行
    if (!processedLine.trim()) {
      processedLines.push("");
      continue;
    }

    // 处理注释行
    if (processedLine.trim().startsWith("#")) {
      if (options.preserveComments) {
        processedLines.push(processedLine.trim());
      }
      continue;
    }

    // 处理规则行
    processedLine = processedLine.trim();

    // 移除前缀
    if (options.removePrefix) {
      // 移除各种可能的前缀格式
      processedLine = processedLine.replace(/^-+\s*/, "").trim();
      processedLine = processedLine.replace(/^\s*-\s*/, "").trim();
    }

    // 移除引号
    if (options.removeQuotes) {
      processedLine = removeQuotes(processedLine);
    }

    // 只添加非空的规则行
    if (processedLine.trim()) {
      processedLines.push(processedLine);
    }
  }

  return processedLines.join("\n");
}

/**
 * 移除字符串首尾的引号
 * 支持多种引号类型：" ' " " ' '
 */
function removeQuotes(str: string): string {
  const quotes = new Set(['"', "'", '"', '"', "'", "'"]);
  let result = str.trim();

  // 多次处理，确保移除嵌套引号
  let changed = true;
  while (changed && result.length > 1) {
    changed = false;
    const firstChar = result[0];
    const lastChar = result[result.length - 1];

    if (quotes.has(firstChar) && quotes.has(lastChar)) {
      result = result.slice(1, -1).trim();
      changed = true;
    }
  }

  return result;
}

/**
 * 从文件读取内容
 * @param file 文件对象
 * @param options 导入选项
 * @returns Promise<string> 处理后的内容
 */
export function importRulesFromFile(
  file: File,
  options: ImportOptions = DEFAULT_IMPORT_OPTIONS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const processedContent = processImportedRules(content, options);
        resolve(processedContent);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file, "utf-8");
  });
}

/**
 * 获取规则统计信息
 * @param content 规则内容
 * @returns 统计信息
 */
export function getRuleStats(content: string): {
  totalLines: number;
  ruleLines: number;
  commentLines: number;
  emptyLines: number;
} {
  const lines = content.split("\n");
  let ruleLines = 0;
  let commentLines = 0;
  let emptyLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      emptyLines++;
    } else if (trimmed.startsWith("#")) {
      commentLines++;
    } else {
      ruleLines++;
    }
  }

  return {
    totalLines: lines.length,
    ruleLines,
    commentLines,
    emptyLines,
  };
}

/**
 * 验证规则格式
 * @param content 规则内容
 * @returns 验证结果
 */
export function validateRules(content: string): {
  isValid: boolean;
  errors: Array<{ line: number; message: string }>;
} {
  const lines = content.split("\n");
  const errors: Array<{ line: number; message: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // 跳过空行和注释
    if (!line || line.startsWith("#")) {
      continue;
    }

    // 基本格式验证
    const parts = line.split(",");
    if (parts.length < 2) {
      errors.push({
        line: lineNumber,
        message: "规则格式错误：至少需要规则类型和内容",
      });
      continue;
    }

    const ruleType = parts[0].trim();
    if (!ruleType) {
      errors.push({
        line: lineNumber,
        message: "规则类型不能为空",
      });
    }

    const content = parts[1].trim();
    if (!content && ruleType !== "MATCH") {
      errors.push({
        line: lineNumber,
        message: "规则内容不能为空",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
