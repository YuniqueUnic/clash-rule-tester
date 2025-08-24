/**
 * 持久化状态管理 Hook
 * 自动将状态同步到 localStorage
 */

import { useCallback, useEffect, useState } from "react";
import { storage, STORAGE_KEYS, type StorageData } from "@/lib/storage-manager";

/**
 * 使用持久化状态的 Hook
 * @param key 存储键名
 * @param defaultValue 默认值
 * @param debounceMs 防抖延迟（毫秒）
 */
export function usePersistentState<K extends keyof StorageData>(
  key: K,
  defaultValue: StorageData[K],
  debounceMs: number = 500,
): [StorageData[K], (value: StorageData[K]) => void] {
  // 初始化状态 - 避免 SSR 不一致
  const [state, setState] = useState<StorageData[K]>(defaultValue);
  const [isClient, setIsClient] = useState(false);

  // 调试日志
  console.log(`🔧 [usePersistentState] Initializing for key: ${key}`, {
    defaultValue,
    debounceMs,
  });

  // 在客户端加载存储的值
  useEffect(() => {
    setIsClient(true);
    console.log(`🔧 [usePersistentState] Loading stored value for key: ${key}`);

    // 尝试获取存储的值，不传入 defaultValue
    const storedValue = storage.get(key);
    console.log(`🔧 [usePersistentState] Retrieved stored value:`, {
      key,
      storedValue,
      type: typeof storedValue,
      isUndefined: storedValue === undefined,
    });

    // 只有当存储值确实存在时才更新状态
    if (storedValue !== undefined) {
      console.log(
        `🔧 [usePersistentState] Updating state with stored value for key: ${key}`,
        storedValue,
      );
      setState(storedValue);
    } else {
      console.log(
        `🔧 [usePersistentState] No stored value found for key: ${key}, keeping default:`,
        defaultValue,
      );
    }
    // 如果没有存储值，保持当前的 defaultValue 状态
  }, [key]); // 移除 defaultValue 依赖，避免无限循环

  // 防抖保存到 localStorage
  const debouncedSave = useCallback(
    debounce((value: StorageData[K]) => {
      console.log(
        `🔧 [usePersistentState] Executing debounced save for key: ${key}`,
        value,
      );
      const success = storage.set(key, value);
      console.log(`🔧 [usePersistentState] Save result for key: ${key}`, {
        success,
        value,
        localStorage: typeof window !== "undefined"
          ? localStorage.getItem(key)
          : "N/A",
      });
    }, debounceMs),
    [key, debounceMs],
  );

  // 更新状态并保存
  const updateState = useCallback((value: StorageData[K]) => {
    console.log(`🔧 [usePersistentState] Updating state for key: ${key}`, {
      newValue: value,
      previousState: state,
    });
    setState(value);
    // 总是尝试保存，不检查 isClient，因为用户操作时肯定在客户端
    console.log(
      `🔧 [usePersistentState] Triggering debounced save for key: ${key}`,
      value,
    );
    debouncedSave(value);
  }, [debouncedSave, key, state]);

  // 监听其他标签页的变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue) as StorageData[K];
          setState(newValue);
        } catch (error) {
          console.error(`Failed to parse storage change for ${key}:`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [state, updateState];
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 编辑器内容持久化 Hook
 */
export function usePersistentEditorContent(defaultContent: string = "") {
  return usePersistentState(STORAGE_KEYS.EDITOR_CONTENT, defaultContent, 1000);
}

/**
 * AI 设置持久化 Hook
 */
export function usePersistentAISettings(defaultSettings: any = {}) {
  return usePersistentState(STORAGE_KEYS.AI_SETTINGS, defaultSettings, 500);
}

/**
 * 测试参数持久化 Hook
 */
export function usePersistentTestParams(defaultParams: any = {}) {
  return usePersistentState(STORAGE_KEYS.TEST_PARAMS, defaultParams, 500);
}

/**
 * 测试历史持久化 Hook
 */
export function usePersistentTestHistory(defaultHistory: any[] = []) {
  return usePersistentState(STORAGE_KEYS.TEST_HISTORY, defaultHistory, 1000);
}

/**
 * 测试指标持久化 Hook
 */
export function usePersistentTestMetrics(defaultMetrics: any = {}) {
  return usePersistentState(STORAGE_KEYS.TEST_METRICS, defaultMetrics, 1000);
}

/**
 * UI 状态持久化 Hook
 */
export function usePersistentUIState(defaultState: any = {}) {
  return usePersistentState(STORAGE_KEYS.UI_STATE, defaultState, 300);
}

/**
 * 测试请求参数持久化 Hook
 */
export function usePersistentTestRequestParams(defaultParams: any = {}) {
  return usePersistentState(
    STORAGE_KEYS.TEST_REQUEST_PARAMS,
    defaultParams,
    500,
  );
}

/**
 * 测试复选框状态持久化 Hook
 */
export function usePersistentTestCheckboxStates(defaultStates: any = {}) {
  return usePersistentState(
    STORAGE_KEYS.TEST_CHECKBOX_STATES,
    defaultStates,
    500,
  );
}

/**
 * AI 规则解释持久化 Hook
 */
export function usePersistentAIRuleExplanation(
  defaultExplanation: string = "",
) {
  return usePersistentState(
    STORAGE_KEYS.AI_RULE_EXPLANATION,
    defaultExplanation,
    1000,
  );
}

/**
 * AI 最后匹配结果持久化 Hook
 */
export function usePersistentAILastMatchResult(defaultResult: any = null) {
  return usePersistentState(
    STORAGE_KEYS.AI_LAST_MATCH_RESULT,
    defaultResult,
    1000,
  );
}

/**
 * 编辑器高亮行持久化 Hook
 */
export function usePersistentHighlightedLine(
  defaultLine: number | null = null,
) {
  return usePersistentState(
    STORAGE_KEYS.EDITOR_HIGHLIGHTED_LINE,
    defaultLine,
    500,
  );
}

/**
 * 数据源持久化 Hooks
 */
export function usePersistentDataPolicies(defaultPolicies: any[] = []) {
  return usePersistentState(STORAGE_KEYS.DATA_POLICIES, defaultPolicies, 1000);
}

export function usePersistentDataGeoIP(defaultGeoIP: any[] = []) {
  return usePersistentState(STORAGE_KEYS.DATA_GEOIP, defaultGeoIP, 1000);
}

export function usePersistentDataNetworkTypes(defaultNetworkTypes: any[] = []) {
  return usePersistentState(
    STORAGE_KEYS.DATA_NETWORK_TYPES,
    defaultNetworkTypes,
    1000,
  );
}

export function usePersistentDataGeoSite(defaultGeoSite: any[] = []) {
  return usePersistentState(STORAGE_KEYS.DATA_GEOSITE, defaultGeoSite, 1000);
}

export function usePersistentDataASN(defaultASN: any[] = []) {
  return usePersistentState(STORAGE_KEYS.DATA_ASN, defaultASN, 1000);
}

/**
 * 批量状态管理 Hook
 * 用于管理多个相关状态
 */
export function usePersistentStates() {
  const [editorContent, setEditorContent] = usePersistentEditorContent();
  const [aiSettings, setAISettings] = usePersistentAISettings();
  const [testParams, setTestParams] = usePersistentTestParams();
  const [testHistory, setTestHistory] = usePersistentTestHistory();
  const [testMetrics, setTestMetrics] = usePersistentTestMetrics();
  const [uiState, setUIState] = usePersistentUIState();

  // 重置所有状态
  const resetAllStates = useCallback(() => {
    storage.clear();
    setEditorContent("");
    setAISettings({});
    setTestParams({});
    setTestHistory([]);
    setTestMetrics({});
    setUIState({});
  }, [
    setEditorContent,
    setAISettings,
    setTestParams,
    setTestHistory,
    setTestMetrics,
    setUIState,
  ]);

  // 导出所有状态
  const exportAllStates = useCallback(() => {
    return storage.export();
  }, []);

  // 导入所有状态
  const importAllStates = useCallback((data: Record<string, any>) => {
    const success = storage.import(data);
    if (success) {
      // 重新加载状态
      setEditorContent(storage.get(STORAGE_KEYS.EDITOR_CONTENT, "") || "");
      setAISettings(storage.get(STORAGE_KEYS.AI_SETTINGS, {}) || {});
      setTestParams(storage.get(STORAGE_KEYS.TEST_PARAMS, {}) || {});
      setTestHistory(storage.get(STORAGE_KEYS.TEST_HISTORY, []) || []);
      setTestMetrics(storage.get(STORAGE_KEYS.TEST_METRICS, {}) || {});
      setUIState(storage.get(STORAGE_KEYS.UI_STATE, {}) || {});
    }
    return success;
  }, [
    setEditorContent,
    setAISettings,
    setTestParams,
    setTestHistory,
    setTestMetrics,
    setUIState,
  ]);

  return {
    // 状态
    editorContent,
    aiSettings,
    testParams,
    testHistory,
    testMetrics,
    uiState,

    // 更新函数
    setEditorContent,
    setAISettings,
    setTestParams,
    setTestHistory,
    setTestMetrics,
    setUIState,

    // 管理函数
    resetAllStates,
    exportAllStates,
    importAllStates,
  };
}
