/**
 * Clash 规则格式化工具
 * 将行内注释转换为独立注释行，并清理格式
 */

/**
 * 格式化 Clash 规则文本
 * 将行内注释转换为独立的注释行
 * @param content 原始规则内容
 * @returns 格式化后的规则内容
 */
export function formatClashRules(content: string): string {
  const lines = content.split("\n");
  const formattedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 跳过空行
    if (!trimmedLine) {
      formattedLines.push("");
      continue;
    }

    // 如果已经是注释行，直接保留
    if (trimmedLine.startsWith("#")) {
      formattedLines.push(trimmedLine);
      continue;
    }

    // 检查是否包含行内注释
    const commentIndex = findInlineCommentIndex(trimmedLine);

    if (commentIndex === -1) {
      // 没有行内注释，直接保留
      formattedLines.push(trimmedLine);
    } else {
      // 有行内注释，需要分离
      const ruleText = trimmedLine.substring(0, commentIndex).trim();
      const commentText = trimmedLine.substring(commentIndex).trim();

      // 先添加注释行
      if (commentText) {
        formattedLines.push(commentText);
      }

      // 再添加规则行
      if (ruleText) {
        formattedLines.push(ruleText);
      }
    }
  }

  return formattedLines.join("\n");
}

/**
 * 查找行内注释的位置
 * 需要确保 # 不是在字符串内部
 * @param line 文本行
 * @returns 注释开始的索引，如果没有找到返回 -1
 */
function findInlineCommentIndex(line: string): number {
  // 简单的启发式方法：查找第一个 # 符号
  // 但要确保它前面有空格或制表符（表示是注释而不是规则的一部分）

  for (let i = 0; i < line.length; i++) {
    if (line[i] === "#") {
      // 检查 # 前面是否有空白字符
      if (i === 0 || /\s/.test(line[i - 1])) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * 检查文本是否包含行内注释
 * @param content 规则内容
 * @returns 是否包含行内注释
 */
export function hasInlineComments(content: string): boolean {
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 跳过空行和纯注释行
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // 检查是否有行内注释
    if (findInlineCommentIndex(trimmedLine) !== -1) {
      return true;
    }
  }

  return false;
}

/**
 * 获取格式化统计信息
 * @param originalContent 原始内容
 * @param formattedContent 格式化后的内容
 * @returns 统计信息
 */
export function getFormatStats(
  originalContent: string,
  formattedContent: string,
) {
  const originalLines = originalContent.split("\n").filter((line) =>
    line.trim()
  );
  const formattedLines = formattedContent.split("\n").filter((line) =>
    line.trim()
  );

  const originalInlineComments = originalLines.filter((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith("#") && findInlineCommentIndex(trimmed) !== -1;
  }).length;

  return {
    originalLineCount: originalLines.length,
    formattedLineCount: formattedLines.length,
    inlineCommentsConverted: originalInlineComments,
    linesAdded: formattedLines.length - originalLines.length,
  };
}

/**
 * 预览格式化结果
 * 返回格式化前后的对比信息
 * @param content 原始内容
 * @returns 预览信息
 */
export function previewFormat(content: string) {
  const formatted = formatClashRules(content);
  const stats = getFormatStats(content, formatted);
  const hasChanges = content !== formatted;

  return {
    original: content,
    formatted,
    stats,
    hasChanges,
  };
}
