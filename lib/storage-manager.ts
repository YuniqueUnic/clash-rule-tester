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

    try {
      const serializedValue = JSON.stringify(value);
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
      return JSON.parse(item) as StorageData[K];
    } catch (error) {
      console.error(`Failed to get storage item ${key}:`, error);
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
      const value = this.getItem(key as keyof StorageData);
      if (value !== undefined) {
        data[key] = value;
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
};
