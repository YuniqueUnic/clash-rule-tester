"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  PolicyData,
  GeoIPCountryData,
  NetworkTypeData,
  BUILT_IN_POLICIES,
  GEOIP_COUNTRIES,
  NETWORK_TYPES,
  GEOSITE_CATEGORIES,
  IP_TO_ASN_MAP,
} from "@/lib/clash-data-sources";

// 数据项接口
export interface PolicyItem extends PolicyData {
  id: string;
  createdAt?: number;
}

export interface GeoIPItem extends GeoIPCountryData {
  id: string;
}

export interface NetworkTypeItem extends NetworkTypeData {
  id: string;
}

export interface GeoSiteItem {
  id: string;
  category: string;
  domains: string[];
}

export interface ASNItem {
  id: string;
  ip: string;
  asn: string;
}

// Context接口
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
  
  // GeoIP管理
  addGeoIP: (country: Omit<GeoIPItem, "id">) => void;
  updateGeoIP: (id: string, country: Partial<GeoIPItem>) => void;
  deleteGeoIP: (id: string) => void;
  
  // 网络类型管理
  addNetworkType: (networkType: Omit<NetworkTypeItem, "id">) => void;
  updateNetworkType: (id: string, networkType: Partial<NetworkTypeItem>) => void;
  deleteNetworkType: (id: string) => void;
  
  // GeoSite管理
  addGeoSite: (geoSite: Omit<GeoSiteItem, "id">) => void;
  updateGeoSite: (id: string, geoSite: Partial<GeoSiteItem>) => void;
  deleteGeoSite: (id: string) => void;
  
  // ASN管理
  addASN: (asn: Omit<ASNItem, "id">) => void;
  updateASN: (id: string, asn: Partial<ASNItem>) => void;
  deleteASN: (id: string) => void;
  
  // 批量操作
  importPolicies: (policies: PolicyItem[]) => void;
  importGeoIP: (countries: GeoIPItem[]) => void;
  importNetworkTypes: (networkTypes: NetworkTypeItem[]) => void;
  importGeoSite: (geoSites: GeoSiteItem[]) => void;
  importASN: (asnData: ASNItem[]) => void;
}

// 创建Context
const DataContext = createContext<DataContextType | undefined>(undefined);

// 生成唯一ID的工具函数
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// 初始化数据的工具函数
const initializePolicies = (): PolicyItem[] => {
  return BUILT_IN_POLICIES.map((policy, index) => ({
    ...policy,
    id: `policy-${index}`,
    createdAt: Date.now() + index,
  }));
};

const initializeGeoIP = (): GeoIPItem[] => {
  return GEOIP_COUNTRIES.map((country, index) => ({
    ...country,
    id: `geoip-${index}`,
  }));
};

const initializeNetworkTypes = (): NetworkTypeItem[] => {
  return NETWORK_TYPES.map((networkType, index) => ({
    ...networkType,
    id: `network-${index}`,
  }));
};

const initializeGeoSite = (): GeoSiteItem[] => {
  return Object.entries(GEOSITE_CATEGORIES).map(([category, domains], index) => ({
    id: `geosite-${index}`,
    category,
    domains,
  }));
};

const initializeASN = (): ASNItem[] => {
  return Object.entries(IP_TO_ASN_MAP).map(([ip, asn], index) => ({
    id: `asn-${index}`,
    ip,
    asn,
  }));
};

// Provider组件
export function DataProvider({ children }: { children: ReactNode }) {
  // 初始化状态
  const [policies, setPolicies] = useState<PolicyItem[]>(initializePolicies);
  const [geoIPCountries, setGeoIPCountries] = useState<GeoIPItem[]>(initializeGeoIP);
  const [networkTypes, setNetworkTypes] = useState<NetworkTypeItem[]>(initializeNetworkTypes);
  const [geoSiteData, setGeoSiteData] = useState<GeoSiteItem[]>(initializeGeoSite);
  const [asnData, setAsnData] = useState<ASNItem[]>(initializeASN);

  // 策略管理函数
  const addPolicy = useCallback((policy: Omit<PolicyItem, "id">) => {
    const newPolicy: PolicyItem = {
      ...policy,
      id: generateId(),
      createdAt: Date.now(),
    };
    setPolicies(prev => [...prev, newPolicy]);
  }, []);

  const updatePolicy = useCallback((id: string, policy: Partial<PolicyItem>) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, ...policy } : p));
  }, []);

  const deletePolicy = useCallback((id: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id));
  }, []);

  // GeoIP管理函数
  const addGeoIP = useCallback((country: Omit<GeoIPItem, "id">) => {
    const newCountry: GeoIPItem = {
      ...country,
      id: generateId(),
    };
    setGeoIPCountries(prev => [...prev, newCountry]);
  }, []);

  const updateGeoIP = useCallback((id: string, country: Partial<GeoIPItem>) => {
    setGeoIPCountries(prev => prev.map(c => c.id === id ? { ...c, ...country } : c));
  }, []);

  const deleteGeoIP = useCallback((id: string) => {
    setGeoIPCountries(prev => prev.filter(c => c.id !== id));
  }, []);

  // 网络类型管理函数
  const addNetworkType = useCallback((networkType: Omit<NetworkTypeItem, "id">) => {
    const newNetworkType: NetworkTypeItem = {
      ...networkType,
      id: generateId(),
    };
    setNetworkTypes(prev => [...prev, newNetworkType]);
  }, []);

  const updateNetworkType = useCallback((id: string, networkType: Partial<NetworkTypeItem>) => {
    setNetworkTypes(prev => prev.map(n => n.id === id ? { ...n, ...networkType } : n));
  }, []);

  const deleteNetworkType = useCallback((id: string) => {
    setNetworkTypes(prev => prev.filter(n => n.id !== id));
  }, []);

  // GeoSite管理函数
  const addGeoSite = useCallback((geoSite: Omit<GeoSiteItem, "id">) => {
    const newGeoSite: GeoSiteItem = {
      ...geoSite,
      id: generateId(),
    };
    setGeoSiteData(prev => [...prev, newGeoSite]);
  }, []);

  const updateGeoSite = useCallback((id: string, geoSite: Partial<GeoSiteItem>) => {
    setGeoSiteData(prev => prev.map(g => g.id === id ? { ...g, ...geoSite } : g));
  }, []);

  const deleteGeoSite = useCallback((id: string) => {
    setGeoSiteData(prev => prev.filter(g => g.id !== id));
  }, []);

  // ASN管理函数
  const addASN = useCallback((asn: Omit<ASNItem, "id">) => {
    const newASN: ASNItem = {
      ...asn,
      id: generateId(),
    };
    setAsnData(prev => [...prev, newASN]);
  }, []);

  const updateASN = useCallback((id: string, asn: Partial<ASNItem>) => {
    setAsnData(prev => prev.map(a => a.id === id ? { ...a, ...asn } : a));
  }, []);

  const deleteASN = useCallback((id: string) => {
    setAsnData(prev => prev.filter(a => a.id !== id));
  }, []);

  // 批量导入函数
  const importPolicies = useCallback((newPolicies: PolicyItem[]) => {
    const policiesWithIds = newPolicies.map(policy => ({
      ...policy,
      id: generateId(),
      createdAt: Date.now(),
    }));
    setPolicies(prev => [...prev, ...policiesWithIds]);
  }, []);

  const importGeoIP = useCallback((newCountries: GeoIPItem[]) => {
    const countriesWithIds = newCountries.map(country => ({
      ...country,
      id: generateId(),
    }));
    setGeoIPCountries(prev => [...prev, ...countriesWithIds]);
  }, []);

  const importNetworkTypes = useCallback((newNetworkTypes: NetworkTypeItem[]) => {
    const networkTypesWithIds = newNetworkTypes.map(networkType => ({
      ...networkType,
      id: generateId(),
    }));
    setNetworkTypes(prev => [...prev, ...networkTypesWithIds]);
  }, []);

  const importGeoSite = useCallback((newGeoSites: GeoSiteItem[]) => {
    const geoSitesWithIds = newGeoSites.map(geoSite => ({
      ...geoSite,
      id: generateId(),
    }));
    setGeoSiteData(prev => [...prev, ...geoSitesWithIds]);
  }, []);

  const importASN = useCallback((newASNData: ASNItem[]) => {
    const asnDataWithIds = newASNData.map(asn => ({
      ...asn,
      id: generateId(),
    }));
    setAsnData(prev => [...prev, ...asnDataWithIds]);
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
    
    // GeoIP管理
    addGeoIP,
    updateGeoIP,
    deleteGeoIP,
    
    // 网络类型管理
    addNetworkType,
    updateNetworkType,
    deleteNetworkType,
    
    // GeoSite管理
    addGeoSite,
    updateGeoSite,
    deleteGeoSite,
    
    // ASN管理
    addASN,
    updateASN,
    deleteASN,
    
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
