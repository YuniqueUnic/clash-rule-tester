"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  BUILT_IN_POLICIES,
  GEOIP_COUNTRIES,
  GeoIPCountryData,
  GEOSITE_CATEGORIES,
  IP_TO_ASN_MAP,
  NETWORK_TYPES,
  NetworkTypeData,
  PolicyData,
} from "@/lib/clash-data-sources";
import { STORAGE_KEYS, storageManager } from "@/lib/storage-manager";
import {
  usePersistentDataASN,
  usePersistentDataGeoIP,
  usePersistentDataGeoSite,
  usePersistentDataNetworkTypes,
  usePersistentDataPolicies,
} from "@/hooks/use-persistent-state";

// 数据项接口
export interface PolicyItem extends PolicyData {
  id: string;
  createdAt?: number;
  enabled: boolean;
}

export interface GeoIPItem extends GeoIPCountryData {
  id: string;
  enabled: boolean;
}

export interface NetworkTypeItem extends NetworkTypeData {
  id: string;
  enabled: boolean;
}

export interface GeoSiteItem {
  id: string;
  category: string;
  domains: string[];
  enabled: boolean;
}

export interface ASNItem {
  id: string;
  ip: string;
  asn: string;
  enabled: boolean;
}

// Context 接口
interface DataContextType {
  // 数据状态
  policies: PolicyItem[];
  geoIPCountries: GeoIPItem[];
  networkTypes: NetworkTypeItem[];
  geoSiteData: GeoSiteItem[];
  asnData: ASNItem[];

  // 策略管理
  addPolicy: (policy: Omit<PolicyItem, "id">) => void;
  updatePolicy: (id: string, policy: Partial<PolicyItem>) => void;
  deletePolicy: (id: string) => void;

  // GeoIP 管理
  addGeoIP: (country: Omit<GeoIPItem, "id">) => void;
  updateGeoIP: (id: string, country: Partial<GeoIPItem>) => void;
  deleteGeoIP: (id: string) => void;

  // 网络类型管理
  addNetworkType: (networkType: Omit<NetworkTypeItem, "id">) => void;
  updateNetworkType: (
    id: string,
    networkType: Partial<NetworkTypeItem>,
  ) => void;
  deleteNetworkType: (id: string) => void;

  // GeoSite 管理
  addGeoSite: (geoSite: Omit<GeoSiteItem, "id">) => void;
  updateGeoSite: (id: string, geoSite: Partial<GeoSiteItem>) => void;
  deleteGeoSite: (id: string) => void;

  // ASN 管理
  addASN: (asn: Omit<ASNItem, "id">) => void;
  updateASN: (id: string, asn: Partial<ASNItem>) => void;
  deleteASN: (id: string) => void;

  // 启用/禁用状态管理
  togglePolicyEnabled: (id: string) => void;
  toggleGeoIPEnabled: (id: string) => void;
  toggleNetworkTypeEnabled: (id: string) => void;
  toggleGeoSiteEnabled: (id: string) => void;
  toggleASNEnabled: (id: string) => void;

  // 获取已启用数据的方法
  getEnabledPolicies: () => PolicyItem[];
  getEnabledGeoIP: () => GeoIPItem[];
  getEnabledNetworkTypes: () => NetworkTypeItem[];
  getEnabledGeoSite: () => GeoSiteItem[];
  getEnabledASN: () => ASNItem[];

  // 批量操作
  importPolicies: (policies: PolicyItem[]) => void;
  importGeoIP: (countries: GeoIPItem[]) => void;
  importNetworkTypes: (networkTypes: NetworkTypeItem[]) => void;
  importGeoSite: (geoSites: GeoSiteItem[]) => void;
  importASN: (asnData: ASNItem[]) => void;
}

// 创建 Context
const DataContext = createContext<DataContextType | undefined>(undefined);

// 生成唯一 ID 的工具函数
const generateId = () =>
  Date.now().toString() + Math.random().toString(36).substr(2, 9);

// 基于名称生成ID的工具函数
const generateIdFromName = (
  name: string,
  existingIds: string[] = [],
): string => {
  // 1. 处理特殊字符，转换为安全的ID格式
  let id = name
    .toLowerCase() // 转换为小写
    .trim() // 去除首尾空格
    .replace(/\s+/g, "-") // 空格替换为连字符
    .replace(/[^a-z0-9\-]/g, "") // 只保留字母、数字、连字符
    .replace(/--+/g, "-") // 多个连字符合并为一个
    .replace(/^-+|-+$/g, ""); // 去除首尾连字符

  // 2. 如果处理后为空，使用默认前缀
  if (!id) {
    id = "item";
  }

  // 3. 检查唯一性，如果重复则添加数字后缀
  let finalId = id;
  let counter = 1;
  while (existingIds.includes(finalId)) {
    finalId = `${id}-${counter}`;
    counter++;
  }

  return finalId;
};

// 初始化数据的工具函数
const initializePolicies = (): PolicyItem[] => {
  const existingIds: string[] = [];
  return BUILT_IN_POLICIES.map((policy, index) => {
    const id = generateIdFromName(policy.name, existingIds);
    existingIds.push(id);
    return {
      ...policy,
      id,
      createdAt: Date.now() + index,
      enabled: true, // 默认启用
    };
  });
};

const initializeGeoIP = (): GeoIPItem[] => {
  const existingIds: string[] = [];
  return GEOIP_COUNTRIES.map((country) => {
    const id = generateIdFromName(country.code, existingIds);
    existingIds.push(id);
    return {
      ...country,
      id,
      enabled: true, // 默认启用
    };
  });
};

const initializeNetworkTypes = (): NetworkTypeItem[] => {
  const existingIds: string[] = [];
  return NETWORK_TYPES.map((networkType) => {
    const id = generateIdFromName(networkType.type, existingIds);
    existingIds.push(id);
    return {
      ...networkType,
      id,
      enabled: true, // 默认启用
    };
  });
};

const initializeGeoSite = (): GeoSiteItem[] => {
  const existingIds: string[] = [];
  return Object.entries(GEOSITE_CATEGORIES).map(([category, domains]) => {
    const id = generateIdFromName(category, existingIds);
    existingIds.push(id);
    return {
      id,
      category,
      domains,
      enabled: true, // 默认启用
    };
  });
};

const initializeASN = (): ASNItem[] => {
  const existingIds: string[] = [];
  return Object.entries(IP_TO_ASN_MAP).map(([ip, asn]) => {
    const id = generateIdFromName(`${ip}-${asn}`, existingIds);
    existingIds.push(id);
    return {
      id,
      ip,
      asn,
      enabled: true, // 默认启用
    };
  });
};

// Provider 组件
export function DataProvider({ children }: { children: ReactNode }) {
  // 保持原有的 useState 实现，在主页面级别添加持久化
  const [policies, setPolicies] = useState<PolicyItem[]>(initializePolicies);
  const [geoIPCountries, setGeoIPCountries] = useState<GeoIPItem[]>(
    initializeGeoIP,
  );
  const [networkTypes, setNetworkTypes] = useState<NetworkTypeItem[]>(
    initializeNetworkTypes,
  );
  const [geoSiteData, setGeoSiteData] = useState<GeoSiteItem[]>(
    initializeGeoSite,
  );
  const [asnData, setAsnData] = useState<ASNItem[]>(initializeASN);

  // 数据持久化同步
  useEffect(() => {
    storageManager.setItem(STORAGE_KEYS.DATA_POLICIES, policies);
  }, [policies]);

  useEffect(() => {
    storageManager.setItem(STORAGE_KEYS.DATA_GEOIP, geoIPCountries);
  }, [geoIPCountries]);

  useEffect(() => {
    storageManager.setItem(STORAGE_KEYS.DATA_NETWORK_TYPES, networkTypes);
  }, [networkTypes]);

  useEffect(() => {
    storageManager.setItem(STORAGE_KEYS.DATA_GEOSITE, geoSiteData);
  }, [geoSiteData]);

  useEffect(() => {
    storageManager.setItem(STORAGE_KEYS.DATA_ASN, asnData);
  }, [asnData]);

  // 从 localStorage 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedPolicies = await storageManager.getItem(
          STORAGE_KEYS.DATA_POLICIES,
        );
        if (savedPolicies && Array.isArray(savedPolicies)) {
          setPolicies(savedPolicies);
        }

        const savedGeoIP = await storageManager.getItem(
          STORAGE_KEYS.DATA_GEOIP,
        );
        if (savedGeoIP && Array.isArray(savedGeoIP)) {
          setGeoIPCountries(savedGeoIP);
        }

        const savedNetworkTypes = await storageManager.getItem(
          STORAGE_KEYS.DATA_NETWORK_TYPES,
        );
        if (savedNetworkTypes && Array.isArray(savedNetworkTypes)) {
          setNetworkTypes(savedNetworkTypes);
        }

        const savedGeoSite = await storageManager.getItem(
          STORAGE_KEYS.DATA_GEOSITE,
        );
        if (savedGeoSite && Array.isArray(savedGeoSite)) {
          setGeoSiteData(savedGeoSite);
        }

        const savedASN = await storageManager.getItem(STORAGE_KEYS.DATA_ASN);
        if (savedASN && Array.isArray(savedASN)) {
          setAsnData(savedASN);
        }
      } catch (error) {
        console.error("Failed to load data from storage:", error);
      }
    };

    loadData();
  }, []);

  // 策略管理函数
  const addPolicy = useCallback((policy: Omit<PolicyItem, "id">) => {
    setPolicies((prev) => {
      const existingIds = prev.map((p) => p.id);
      const id = generateIdFromName(policy.name, existingIds);
      const newPolicy: PolicyItem = {
        ...policy,
        id,
        createdAt: Date.now(),
      };
      return [...prev, newPolicy];
    });
  }, []);

  const updatePolicy = useCallback(
    (id: string, policy: Partial<PolicyItem>) => {
      setPolicies((prev) =>
        prev.map((p) => p.id === id ? { ...p, ...policy } : p)
      );
    },
    [],
  );

  const deletePolicy = useCallback((id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // GeoIP 管理函数
  const addGeoIP = useCallback((country: Omit<GeoIPItem, "id">) => {
    setGeoIPCountries((prev) => {
      const existingIds = prev.map((c) => c.id);
      const id = generateIdFromName(country.code, existingIds);
      const newCountry: GeoIPItem = {
        ...country,
        id,
      };
      return [...prev, newCountry];
    });
  }, []);

  const updateGeoIP = useCallback((id: string, country: Partial<GeoIPItem>) => {
    setGeoIPCountries((prev) =>
      prev.map((c) => c.id === id ? { ...c, ...country } : c)
    );
  }, []);

  const deleteGeoIP = useCallback((id: string) => {
    setGeoIPCountries((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // 网络类型管理函数
  const addNetworkType = useCallback(
    (networkType: Omit<NetworkTypeItem, "id">) => {
      setNetworkTypes((prev) => {
        const existingIds = prev.map((n) => n.id);
        const id = generateIdFromName(networkType.type, existingIds);
        const newNetworkType: NetworkTypeItem = {
          ...networkType,
          id,
        };
        return [...prev, newNetworkType];
      });
    },
    [],
  );

  const updateNetworkType = useCallback(
    (id: string, networkType: Partial<NetworkTypeItem>) => {
      setNetworkTypes((prev) =>
        prev.map((n) => n.id === id ? { ...n, ...networkType } : n)
      );
    },
    [],
  );

  const deleteNetworkType = useCallback((id: string) => {
    setNetworkTypes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // GeoSite 管理函数
  const addGeoSite = useCallback((geoSite: Omit<GeoSiteItem, "id">) => {
    setGeoSiteData((prev) => {
      const existingIds = prev.map((g) => g.id);
      const id = generateIdFromName(geoSite.category, existingIds);
      const newGeoSite: GeoSiteItem = {
        ...geoSite,
        id,
      };
      return [...prev, newGeoSite];
    });
  }, []);

  const updateGeoSite = useCallback(
    (id: string, geoSite: Partial<GeoSiteItem>) => {
      setGeoSiteData((prev) =>
        prev.map((g) => g.id === id ? { ...g, ...geoSite } : g)
      );
    },
    [],
  );

  const deleteGeoSite = useCallback((id: string) => {
    setGeoSiteData((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ASN 管理函数
  const addASN = useCallback((asn: Omit<ASNItem, "id">) => {
    setAsnData((prev) => {
      const existingIds = prev.map((a) => a.id);
      const id = generateIdFromName(`${asn.ip}-${asn.asn}`, existingIds);
      const newASN: ASNItem = {
        ...asn,
        id,
      };
      return [...prev, newASN];
    });
  }, []);

  const updateASN = useCallback((id: string, asn: Partial<ASNItem>) => {
    setAsnData((prev) => prev.map((a) => a.id === id ? { ...a, ...asn } : a));
  }, []);

  const deleteASN = useCallback((id: string) => {
    setAsnData((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // 启用/禁用状态管理函数
  const togglePolicyEnabled = useCallback((id: string) => {
    setPolicies((prev) =>
      prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  }, []);

  const toggleGeoIPEnabled = useCallback((id: string) => {
    setGeoIPCountries((prev) =>
      prev.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c)
    );
  }, []);

  const toggleNetworkTypeEnabled = useCallback((id: string) => {
    setNetworkTypes((prev) =>
      prev.map((n) => n.id === id ? { ...n, enabled: !n.enabled } : n)
    );
  }, []);

  const toggleGeoSiteEnabled = useCallback((id: string) => {
    setGeoSiteData((prev) =>
      prev.map((g) => g.id === id ? { ...g, enabled: !g.enabled } : g)
    );
  }, []);

  const toggleASNEnabled = useCallback((id: string) => {
    setAsnData((prev) =>
      prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a)
    );
  }, []);

  // 获取已启用数据的方法
  const getEnabledPolicies = useCallback(() => {
    return policies.filter((p) => p.enabled);
  }, [policies]);

  const getEnabledGeoIP = useCallback(() => {
    return geoIPCountries.filter((c) => c.enabled);
  }, [geoIPCountries]);

  const getEnabledNetworkTypes = useCallback(() => {
    return networkTypes.filter((n) => n.enabled);
  }, [networkTypes]);

  const getEnabledGeoSite = useCallback(() => {
    return geoSiteData.filter((g) => g.enabled);
  }, [geoSiteData]);

  const getEnabledASN = useCallback(() => {
    return asnData.filter((a) => a.enabled);
  }, [asnData]);

  // 批量导入函数
  const importPolicies = useCallback((newPolicies: PolicyItem[]) => {
    const policiesWithIds = newPolicies.map((policy) => ({
      ...policy,
      id: generateId(),
      createdAt: Date.now(),
    }));
    setPolicies((prev) => [...prev, ...policiesWithIds]);
  }, []);

  const importGeoIP = useCallback((newCountries: GeoIPItem[]) => {
    const countriesWithIds = newCountries.map((country) => ({
      ...country,
      id: generateId(),
    }));
    setGeoIPCountries((prev) => [...prev, ...countriesWithIds]);
  }, []);

  const importNetworkTypes = useCallback(
    (newNetworkTypes: NetworkTypeItem[]) => {
      const networkTypesWithIds = newNetworkTypes.map((networkType) => ({
        ...networkType,
        id: generateId(),
      }));
      setNetworkTypes((prev) => [...prev, ...networkTypesWithIds]);
    },
    [],
  );

  const importGeoSite = useCallback((newGeoSites: GeoSiteItem[]) => {
    const geoSitesWithIds = newGeoSites.map((geoSite) => ({
      ...geoSite,
      id: generateId(),
    }));
    setGeoSiteData((prev) => [...prev, ...geoSitesWithIds]);
  }, []);

  const importASN = useCallback((newASNData: ASNItem[]) => {
    const asnDataWithIds = newASNData.map((asn) => ({
      ...asn,
      id: generateId(),
    }));
    setAsnData((prev) => [...prev, ...asnDataWithIds]);
  }, []);

  const value: DataContextType = {
    // 数据状态
    policies,
    geoIPCountries,
    networkTypes,
    geoSiteData,
    asnData,

    // 策略管理
    addPolicy,
    updatePolicy,
    deletePolicy,

    // GeoIP 管理
    addGeoIP,
    updateGeoIP,
    deleteGeoIP,

    // 网络类型管理
    addNetworkType,
    updateNetworkType,
    deleteNetworkType,

    // GeoSite 管理
    addGeoSite,
    updateGeoSite,
    deleteGeoSite,

    // ASN 管理
    addASN,
    updateASN,
    deleteASN,

    // 启用/禁用状态管理
    togglePolicyEnabled,
    toggleGeoIPEnabled,
    toggleNetworkTypeEnabled,
    toggleGeoSiteEnabled,
    toggleASNEnabled,

    // 获取已启用数据的方法
    getEnabledPolicies,
    getEnabledGeoIP,
    getEnabledNetworkTypes,
    getEnabledGeoSite,
    getEnabledASN,

    // 批量操作
    importPolicies,
    importGeoIP,
    importNetworkTypes,
    importGeoSite,
    importASN,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// Hook for using the context
export function useDataContext() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
}
