/**
 * localStorage 管理工具
 * 提供类型安全的本地存储功能
 */

// 存储键名常量
export const STORAGE_KEYS = {
  // 编辑器相关
  EDITOR_CONTENT: "clash-ruler-editor-content",
  EDITOR_HISTORY: "clash-ruler-editor-history",

  // 设置相关
  AI_SETTINGS: "clash-ruler-ai-settings",
  APP_SETTINGS: "clash-ruler-app-settings",

  // 测试相关
  TEST_PARAMS: "clash-ruler-test-params",
  TEST_HISTORY: "clash-ruler-test-history",
  TEST_METRICS: "clash-ruler-test-metrics",
  TEST_REQUEST_PARAMS: "clash-ruler-test-request-params",
  TEST_CHECKBOX_STATES: "clash-ruler-test-checkbox-states",

  // AI 相关状态
  AI_RULE_EXPLANATION: "clash-ruler-ai-rule-explanation",
  AI_LAST_MATCH_RESULT: "clash-ruler-ai-last-match-result",

  // 编辑器状态
  EDITOR_HIGHLIGHTED_LINE: "clash-ruler-editor-highlighted-line",

  // 数据源相关（Settings 中的数据）
  DATA_POLICIES: "clash-ruler-data-policies",
  DATA_GEOIP: "clash-ruler-data-geoip",
  DATA_NETWORK_TYPES: "clash-ruler-data-network-types",
  DATA_GEOSITE: "clash-ruler-data-geosite",
  DATA_ASN: "clash-ruler-data-asn",

  // 其他状态
  UI_STATE: "clash-ruler-ui-state",
} as const;

// 存储数据类型定义
export interface StorageData {
  [STORAGE_KEYS.EDITOR_CONTENT]: string;
  [STORAGE_KEYS.EDITOR_HISTORY]: any[];
  [STORAGE_KEYS.AI_SETTINGS]: any;
  [STORAGE_KEYS.APP_SETTINGS]: any;
  [STORAGE_KEYS.TEST_PARAMS]: any;
  [STORAGE_KEYS.TEST_HISTORY]: any[];
  [STORAGE_KEYS.TEST_METRICS]: any;
  [STORAGE_KEYS.TEST_REQUEST_PARAMS]: any;
  [STORAGE_KEYS.TEST_CHECKBOX_STATES]: any;
  [STORAGE_KEYS.AI_RULE_EXPLANATION]: string;
  [STORAGE_KEYS.AI_LAST_MATCH_RESULT]: any;
  [STORAGE_KEYS.EDITOR_HIGHLIGHTED_LINE]: number | null;
  [STORAGE_KEYS.DATA_POLICIES]: any[];
  [STORAGE_KEYS.DATA_GEOIP]: any[];
  [STORAGE_KEYS.DATA_NETWORK_TYPES]: any[];
  [STORAGE_KEYS.DATA_GEOSITE]: any[];
  [STORAGE_KEYS.DATA_ASN]: any[];
  [STORAGE_KEYS.UI_STATE]: any;
}

/**
 * 存储管理器类
 */
export class StorageManager {
  private static instance: StorageManager;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * 检查 localStorage 是否可用
   */
  private isStorageAvailable(): boolean {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 设置存储项
   */
  setItem<K extends keyof StorageData>(
    key: K,
    value: StorageData[K],
  ): boolean {
    if (!this.isStorageAvailable()) {
      console.warn("localStorage is not available");
      return false;
    }

    // 验证要存储的数据
    if (value === undefined) {
      console.warn(
        `Attempted to store undefined value for key ${key}. Skipping.`,
      );
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);

      // 验证序列化结果
      if (serializedValue === undefined || serializedValue === "undefined") {
        console.warn(
          `Serialization resulted in undefined for key ${key}. Skipping.`,
        );
        return false;
      }

      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error(`Failed to set storage item ${key}:`, error);
      return false;
    }
  }

  /**
   * 获取存储项
   */
  getItem<K extends keyof StorageData>(
    key: K,
    defaultValue?: StorageData[K],
  ): StorageData[K] | undefined {
    if (!this.isStorageAvailable()) {
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      // 检查是否为无效的字符串
      if (item === "undefined" || item === "null" || item.trim() === "") {
        console.warn(
          `Invalid storage item for key ${key}: "${item}". Using default value.`,
        );
        // 清理无效数据
        localStorage.removeItem(key);
        return defaultValue;
      }

      return JSON.parse(item) as StorageData[K];
    } catch (error) {
      console.error(`Failed to get storage item ${key}:`, error);
      // 清理损坏的数据
      try {
        localStorage.removeItem(key);
      } catch (cleanupError) {
        console.error(
          `Failed to cleanup invalid storage item ${key}:`,
          cleanupError,
        );
      }
      return defaultValue;
    }
  }

  /**
   * 移除存储项
   */
  removeItem<K extends keyof StorageData>(key: K): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove storage item ${key}:`, error);
      return false;
    }
  }

  /**
   * 清空所有应用相关的存储
   */
  clearAll(): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error("Failed to clear all storage:", error);
      return false;
    }
  }

  /**
   * 获取存储使用情况
   */
  getStorageInfo(): {
    totalSize: number;
    itemCount: number;
    items: Array<{ key: string; size: number }>;
  } {
    if (!this.isStorageAvailable()) {
      return { totalSize: 0, itemCount: 0, items: [] };
    }

    const items: Array<{ key: string; size: number }> = [];
    let totalSize = 0;

    Object.values(STORAGE_KEYS).forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        const size = new Blob([value]).size;
        items.push({ key, size });
        totalSize += size;
      }
    });

    return {
      totalSize,
      itemCount: items.length,
      items: items.sort((a, b) => b.size - a.size),
    };
  }

  /**
   * 导出所有数据
   */
  exportData(): Record<string, any> {
    const data: Record<string, any> = {};

    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        const value = this.getItem(key as keyof StorageData);
        if (value !== undefined && value !== null) {
          // 验证数据可以被序列化
          const testSerialization = JSON.stringify(value);
          if (
            testSerialization !== undefined && testSerialization !== "undefined"
          ) {
            data[key] = value;
          } else {
            console.warn(`Skipping invalid data for key ${key} during export`);
          }
        }
      } catch (error) {
        console.error(`Failed to export data for key ${key}:`, error);
        // 跳过有问题的数据，继续导出其他数据
      }
    });

    return data;
  }

  /**
   * 导入数据
   */
  importData(data: Record<string, any>): boolean {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (Object.values(STORAGE_KEYS).includes(key as any)) {
          this.setItem(key as keyof StorageData, value);
        }
      });
      return true;
    } catch (error) {
      console.error("Failed to import data:", error);
      return false;
    }
  }

  /**
   * 清理无效数据
   */
  cleanupInvalidData(): number {
    if (!this.isStorageAvailable()) {
      return 0;
    }

    let cleanedCount = 0;
    const keysToClean: string[] = [];

    // 检查所有已知的存储键
    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        const item = localStorage.getItem(key);
        if (item !== null) {
          // 检查是否为无效数据
          if (item === "undefined" || item === "null" || item.trim() === "") {
            keysToClean.push(key);
          } else {
            // 尝试解析 JSON
            try {
              JSON.parse(item);
            } catch {
              keysToClean.push(key);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking key ${key}:`, error);
        keysToClean.push(key);
      }
    });

    // 清理无效数据
    keysToClean.forEach((key) => {
      try {
        localStorage.removeItem(key);
        cleanedCount++;
        console.log(`Cleaned invalid data for key: ${key}`);
      } catch (error) {
        console.error(`Failed to clean key ${key}:`, error);
      }
    });

    return cleanedCount;
  }
}

// 导出单例实例
export const storageManager = StorageManager.getInstance();

// 便捷函数
export const storage = {
  set: <K extends keyof StorageData>(key: K, value: StorageData[K]) =>
    storageManager.setItem(key, value),
  get: <K extends keyof StorageData>(key: K, defaultValue?: StorageData[K]) =>
    storageManager.getItem(key, defaultValue),
  remove: <K extends keyof StorageData>(key: K) =>
    storageManager.removeItem(key),
  clear: () => storageManager.clearAll(),
  info: () => storageManager.getStorageInfo(),
  export: () => storageManager.exportData(),
  import: (data: Record<string, any>) => storageManager.importData(data),
  cleanup: () => storageManager.cleanupInvalidData(),
};
