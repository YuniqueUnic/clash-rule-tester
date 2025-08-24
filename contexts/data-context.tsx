"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
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

// 初始化数据的工具函数
const initializePolicies = (): PolicyItem[] => {
  return BUILT_IN_POLICIES.map((policy, index) => ({
    ...policy,
    id: `policy-${index}`,
    createdAt: Date.now() + index,
    enabled: true, // 默认启用
  }));
};

const initializeGeoIP = (): GeoIPItem[] => {
  return GEOIP_COUNTRIES.map((country, index) => ({
    ...country,
    id: `geoip-${index}`,
    enabled: true, // 默认启用
  }));
};

const initializeNetworkTypes = (): NetworkTypeItem[] => {
  return NETWORK_TYPES.map((networkType, index) => ({
    ...networkType,
    id: `network-${index}`,
    enabled: true, // 默认启用
  }));
};

const initializeGeoSite = (): GeoSiteItem[] => {
  return Object.entries(GEOSITE_CATEGORIES).map((
    [category, domains],
    index,
  ) => ({
    id: `geosite-${index}`,
    category,
    domains,
    enabled: true, // 默认启用
  }));
};

const initializeASN = (): ASNItem[] => {
  return Object.entries(IP_TO_ASN_MAP).map(([ip, asn], index) => ({
    id: `asn-${index}`,
    ip,
    asn,
    enabled: true, // 默认启用
  }));
};

// Provider 组件
export function DataProvider({ children }: { children: ReactNode }) {
  // 初始化状态
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

  // 策略管理函数
  const addPolicy = useCallback((policy: Omit<PolicyItem, "id">) => {
    const newPolicy: PolicyItem = {
      ...policy,
      id: generateId(),
      createdAt: Date.now(),
    };
    setPolicies((prev) => [...prev, newPolicy]);
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
    const newCountry: GeoIPItem = {
      ...country,
      id: generateId(),
    };
    setGeoIPCountries((prev) => [...prev, newCountry]);
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
      const newNetworkType: NetworkTypeItem = {
        ...networkType,
        id: generateId(),
      };
      setNetworkTypes((prev) => [...prev, newNetworkType]);
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
    const newGeoSite: GeoSiteItem = {
      ...geoSite,
      id: generateId(),
    };
    setGeoSiteData((prev) => [...prev, newGeoSite]);
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
    const newASN: ASNItem = {
      ...asn,
      id: generateId(),
    };
    setAsnData((prev) => [...prev, newASN]);
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
