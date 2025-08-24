import { useMemo } from "react";
import { useDataContext } from "@/contexts/data-context";

/**
 * ClashRuleEditor 数据 Hook
 * 统一管理编辑器所需的所有数据，使用真实数据而非模拟数据
 */
export function useClashEditorData() {
  const {
    getEnabledPolicies,
    getEnabledGeoIP,
    getEnabledNetworkTypes,
    getEnabledGeoSite,
    getEnabledASN,
  } = useDataContext();

  // 获取已启用的数据
  const enabledPolicies = getEnabledPolicies();
  const enabledGeoIP = getEnabledGeoIP();
  const enabledNetworkTypes = getEnabledNetworkTypes();
  const enabledGeoSite = getEnabledGeoSite();
  const enabledASN = getEnabledASN();

  // 转换为编辑器需要的格式
  const editorData = useMemo(() => {
    // 策略名称列表
    const policies = [
      // 内置策略
      "DIRECT",
      "PROXY",
      "REJECT",
      "PASS",
      // 用户自定义策略
      ...enabledPolicies.map((p) => p.name),
    ];

    // GeoIP 国家代码列表
    const geoIPCountries = enabledGeoIP.map((country) => country.code);

    // 网络类型列表
    const networkTypes = enabledNetworkTypes.map((network) => network.type);

    // GeoSite 分类列表
    const geoSiteCategories = enabledGeoSite.map((site) => site.category);

    // ASN 列表
    const asnList = enabledASN.map((asn) => asn.asn);

    // 常用端口（从网络类型中提取或预定义）
    const commonPorts = [
      "80",
      "443",
      "22",
      "21",
      "25",
      "53",
      "110",
      "143",
      "993",
      "995",
      "587",
      "465",
      "8080",
      "8443",
      "3389",
      "5432",
      "3306",
      "6379",
      "27017",
      "9200",
      "5601",
      "8000",
      "3000",
      "8888",
      "9000",
    ];

    // 常用进程名
    const commonProcesses = [
      "chrome.exe",
      "firefox.exe",
      "safari",
      "edge.exe",
      "qq.exe",
      "wechat.exe",
      "telegram.exe",
      "discord.exe",
      "steam.exe",
      "spotify.exe",
      "vlc.exe",
      "potplayer.exe",
      "code.exe",
      "idea64.exe",
      "notepad++.exe",
      "git.exe",
      "node.exe",
      "python.exe",
      "java.exe",
      "nginx.exe",
    ];

    // 常用域名后缀
    const commonDomainSuffixes = [
      "google.com",
      "youtube.com",
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "linkedin.com",
      "github.com",
      "stackoverflow.com",
      "baidu.com",
      "qq.com",
      "weibo.com",
      "taobao.com",
      "netflix.com",
      "spotify.com",
      "twitch.tv",
      "discord.com",
    ];

    return {
      policies,
      geoIPCountries,
      networkTypes,
      geoSiteCategories,
      asnList,
      commonPorts,
      commonProcesses,
      commonDomainSuffixes,
      // 原始数据，用于详细信息显示
      rawData: {
        policies: enabledPolicies,
        geoIP: enabledGeoIP,
        networkTypes: enabledNetworkTypes,
        geoSite: enabledGeoSite,
        asn: enabledASN,
      },
    };
  }, [
    enabledPolicies,
    enabledGeoIP,
    enabledNetworkTypes,
    enabledGeoSite,
    enabledASN,
  ]);

  return editorData;
}

/**
 * 获取策略详细信息
 */
export function usePolicyDetails(policyName: string) {
  const { rawData } = useClashEditorData();

  return useMemo(() => {
    const policy = rawData.policies.find((p) => p.name === policyName);
    if (policy) {
      return {
        name: policy.name,
        type: policy.type,
        description: policy.description,
        category: policy.category,
      };
    }

    // 内置策略的描述
    const builtInDescriptions: Record<string, string> = {
      "DIRECT": "直接连接，不使用代理",
      "PROXY": "使用代理连接",
      "REJECT": "拒绝连接",
      "PASS": "跳过当前规则，继续匹配下一条规则",
    };

    return {
      name: policyName,
      type: "built-in" as const,
      description: builtInDescriptions[policyName] || "内置策略",
      category: "built-in",
    };
  }, [policyName, rawData.policies]);
}

/**
 * 获取 GeoIP 国家详细信息
 */
export function useGeoIPDetails(countryCode: string) {
  const { rawData } = useClashEditorData();

  return useMemo(() => {
    const country = rawData.geoIP.find((c) => c.code === countryCode);
    return country
      ? {
        code: country.code,
        name: country.name,
        continent: country.continent,
        popular: country.popular,
      }
      : null;
  }, [countryCode, rawData.geoIP]);
}

/**
 * 获取网络类型详细信息
 */
export function useNetworkTypeDetails(networkType: string) {
  const { rawData } = useClashEditorData();

  return useMemo(() => {
    const network = rawData.networkTypes.find((n) => n.type === networkType);
    return network
      ? {
        type: network.type,
        description: network.description,
        category: network.category,
      }
      : null;
  }, [networkType, rawData.networkTypes]);
}

/**
 * 获取 GeoSite 分类详细信息
 */
export function useGeoSiteDetails(category: string) {
  const { rawData } = useClashEditorData();

  return useMemo(() => {
    const site = rawData.geoSite.find((s) => s.category === category);
    return site
      ? {
        category: site.category,
        domains: site.domains,
        domainCount: site.domains.length,
      }
      : null;
  }, [category, rawData.geoSite]);
}
