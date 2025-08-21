// Clash 规则数据源
// 提供真实的策略、GeoIP 国家代码、网络类型等数据

// Clash 规则类型常量
export const CLASH_RULE_TYPES = [
  "DOMAIN",
  "DOMAIN-SUFFIX",
  "DOMAIN-KEYWORD",
  "DOMAIN-REGEX",
  "IP-CIDR",
  "IP-CIDR6",
  "IP-ASN",
  "GEOIP",
  "GEOSITE",
  "PROCESS-NAME",
  "PROCESS-PATH",
  "PROCESS-PATH-REGEX",
  "DST-PORT",
  "SRC-PORT",
  "IN-PORT",
  "SRC-IP-CIDR",
  "DST-IP-CIDR",
  "RULE-SET",
  "AND",
  "OR",
  "NOT",
  "SUB-RULE",
  "NETWORK",
  "UID",
  "IN-TYPE",
  "MATCH",
] as const;

// 内置策略名称常量
export const CLASH_POLICIES = ["DIRECT", "PROXY", "REJECT", "PASS"] as const;

// 示例规则模板
export const SAMPLE_RULES = `# CLASH Rules Configuration
# Domain rules
DOMAIN-SUFFIX,google.com,PROXY
DOMAIN-SUFFIX,github.com,DIRECT
DOMAIN-KEYWORD,youtube,PROXY
DOMAIN,www.example.com,REJECT

# IP rules
IP-CIDR,192.168.0.0/16,DIRECT
IP-CIDR,10.0.0.0/8,DIRECT
IP-CIDR,8.8.8.0/24,PROXY
GEOIP,CN,DIRECT
GEOIP,US,PROXY

# Process rules
PROCESS-NAME,chrome.exe,PROXY
PROCESS-NAME,firefox.exe,DIRECT

# Port rules
DST-PORT,443,PROXY
DST-PORT,80,DIRECT

# Final rule
MATCH,PROXY`;

// 测试请求接口
export interface TestRequest {
  domain?: string;
  process?: string;
  processPath?: string;
  network?: string;
  uid?: string;
  srcIPv4?: string;
  srcIPv6?: string;
  srcPort?: string;
  dstIPv4?: string;
  dstIPv6?: string;
  dstPort?: string;
  geoIP?: string;
}

// 启用的测试项目接口
export interface EnabledTestItems {
  domain: boolean;
  srcIP: boolean;
  srcPort: boolean;
  dstIP: boolean;
  dstPort: boolean;
  process: boolean;
  processPath: boolean;
  geoIP: boolean;
  network: boolean;
  uid: boolean;
}

// 默认启用的测试项目
export const DEFAULT_ENABLED_TEST_ITEMS: EnabledTestItems = {
  domain: true,
  srcIP: false,
  srcPort: false,
  dstIP: true,
  dstPort: true,
  process: false,
  processPath: false,
  geoIP: true,
  network: true,
  uid: false,
};

// 测试指标接口
export interface TestMetrics {
  totalTests: number;
  averageTime: number;
  successRate: number;
  lastTestTime: number;
}

// 默认测试指标
export const DEFAULT_TEST_METRICS: TestMetrics = {
  totalTests: 0,
  averageTime: 0,
  successRate: 0,
  lastTestTime: 0,
};

// IP 到 ASN 映射（预置数据）
export const IP_TO_ASN_MAP: Record<string, string> = {
  "8.8.8.8": "AS15169", // Google
  "8.8.4.4": "AS15169", // Google
  "1.1.1.1": "AS13335", // Cloudflare
  "1.0.0.1": "AS13335", // Cloudflare
  "114.114.114.114": "AS4134", // China Telecom
  "223.5.5.5": "AS37963", // Alibaba
  "119.29.29.29": "AS45090", // Tencent
  "208.67.222.222": "AS36692", // OpenDNS
  "9.9.9.9": "AS19281", // Quad9
};

// Rule Set 预置数据
export const RULE_SETS: Record<string, (request: TestRequest) => boolean> = {
  // 广告相关域名和 IP
  "ads": (request) => {
    const adDomains = [
      "googleadservices.com",
      "googlesyndication.com",
      "doubleclick.net",
      "facebook.com/tr",
      "amazon-adsystem.com",
    ];
    return !!(
      request.domain && adDomains.some((ad) => request.domain!.includes(ad))
    );
  },

  // 社交媒体平台
  "social": (request) => {
    const socialDomains = [
      "facebook.com",
      "twitter.com",
      "instagram.com",
      "linkedin.com",
      "tiktok.com",
    ];
    return !!(
      request.domain &&
      socialDomains.some((social) => request.domain!.includes(social))
    );
  },

  // 流媒体服务
  "streaming": (request) => {
    const streamingDomains = [
      "netflix.com",
      "youtube.com",
      "twitch.tv",
      "disneyplus.com",
      "spotify.com",
    ];
    return !!(
      request.domain &&
      streamingDomains.some((streaming) => request.domain!.includes(streaming))
    );
  },

  // 游戏平台
  "gaming": (request) => {
    const gamingDomains = [
      "steam.com",
      "epicgames.com",
      "battle.net",
      "riotgames.com",
      "xbox.com",
    ];
    return !!(
      request.domain &&
      gamingDomains.some((game) => request.domain!.includes(game))
    );
  },

  // 开发工具
  "development": (request) => {
    const devDomains = [
      "github.com",
      "gitlab.com",
      "stackoverflow.com",
      "npmjs.com",
      "docker.com",
    ];
    return !!(
      request.domain && devDomains.some((dev) => request.domain!.includes(dev))
    );
  },

  // 国内服务
  "cn": (request) => {
    const cnDomains = [
      "baidu.com",
      "qq.com",
      "taobao.com",
      "weibo.com",
      "bilibili.com",
    ];
    return !!(
      request.domain && cnDomains.some((cn) => request.domain!.includes(cn))
    );
  },

  // 代理工具端口
  "proxy-ports": (request) => {
    const proxyPorts = ["1080", "3128", "8080", "1081", "1082"];
    return !!(
      (request.dstPort && proxyPorts.includes(request.dstPort)) ||
      (request.srcPort && proxyPorts.includes(request.srcPort))
    );
  },
};

export interface PolicyData {
  name: string;
  type: "built-in" | "custom";
  description: string;
  category: string;
}

export interface GeoIPCountryData {
  code: string;
  name: string;
  continent: string;
  popular: boolean;
}

export interface NetworkTypeData {
  type: string;
  description: string;
  category: "transport" | "application" | "tunnel";
}

// 内置策略数据
export const BUILT_IN_POLICIES: PolicyData[] = [
  {
    name: "DIRECT",
    type: "built-in",
    description: "直连，不使用代理",
    category: "basic",
  },
  {
    name: "PROXY",
    type: "built-in",
    description: "使用代理服务器",
    category: "basic",
  },
  {
    name: "REJECT",
    type: "built-in",
    description: "拒绝连接",
    category: "basic",
  },
  {
    name: "PASS",
    type: "built-in",
    description: "跳过当前规则",
    category: "basic",
  },
];

// 常用 GeoIP 国家代码数据
export const GEOIP_COUNTRIES: GeoIPCountryData[] = [
  // 亚洲
  { code: "CN", name: "中国", continent: "Asia", popular: true },
  { code: "JP", name: "日本", continent: "Asia", popular: true },
  { code: "KR", name: "韩国", continent: "Asia", popular: true },
  { code: "SG", name: "新加坡", continent: "Asia", popular: true },
  { code: "HK", name: "香港", continent: "Asia", popular: true },
  { code: "TW", name: "台湾", continent: "Asia", popular: true },
  { code: "IN", name: "印度", continent: "Asia", popular: false },
  { code: "TH", name: "泰国", continent: "Asia", popular: false },
  { code: "MY", name: "马来西亚", continent: "Asia", popular: false },
  { code: "ID", name: "印度尼西亚", continent: "Asia", popular: false },
  { code: "PH", name: "菲律宾", continent: "Asia", popular: false },
  { code: "VN", name: "越南", continent: "Asia", popular: false },

  // 北美
  { code: "US", name: "美国", continent: "North America", popular: true },
  { code: "CA", name: "加拿大", continent: "North America", popular: true },
  { code: "MX", name: "墨西哥", continent: "North America", popular: false },

  // 欧洲
  { code: "GB", name: "英国", continent: "Europe", popular: true },
  { code: "DE", name: "德国", continent: "Europe", popular: true },
  { code: "FR", name: "法国", continent: "Europe", popular: true },
  { code: "NL", name: "荷兰", continent: "Europe", popular: true },
  { code: "IT", name: "意大利", continent: "Europe", popular: false },
  { code: "ES", name: "西班牙", continent: "Europe", popular: false },
  { code: "CH", name: "瑞士", continent: "Europe", popular: false },
  { code: "SE", name: "瑞典", continent: "Europe", popular: false },
  { code: "NO", name: "挪威", continent: "Europe", popular: false },
  { code: "FI", name: "芬兰", continent: "Europe", popular: false },
  { code: "DK", name: "丹麦", continent: "Europe", popular: false },
  { code: "RU", name: "俄罗斯", continent: "Europe", popular: false },

  // 大洋洲
  { code: "AU", name: "澳大利亚", continent: "Oceania", popular: true },
  { code: "NZ", name: "新西兰", continent: "Oceania", popular: false },

  // 南美
  { code: "BR", name: "巴西", continent: "South America", popular: false },
  { code: "AR", name: "阿根廷", continent: "South America", popular: false },
  { code: "CL", name: "智利", continent: "South America", popular: false },

  // 非洲
  { code: "ZA", name: "南非", continent: "Africa", popular: false },
  { code: "EG", name: "埃及", continent: "Africa", popular: false },
];

// 网络类型数据
export const NETWORK_TYPES: NetworkTypeData[] = [
  // 传输层协议
  {
    type: "TCP",
    description: "Transmission Control Protocol",
    category: "transport",
  },
  { type: "UDP", description: "User Datagram Protocol", category: "transport" },
  {
    type: "ICMP",
    description: "Internet Control Message Protocol",
    category: "transport",
  },
  {
    type: "SCTP",
    description: "Stream Control Transmission Protocol",
    category: "transport",
  },

  // 应用层协议
  {
    type: "HTTP",
    description: "HyperText Transfer Protocol",
    category: "application",
  },
  { type: "HTTPS", description: "HTTP Secure", category: "application" },
  {
    type: "FTP",
    description: "File Transfer Protocol",
    category: "application",
  },
  {
    type: "SMTP",
    description: "Simple Mail Transfer Protocol",
    category: "application",
  },
  {
    type: "POP3",
    description: "Post Office Protocol 3",
    category: "application",
  },
  {
    type: "IMAP",
    description: "Internet Message Access Protocol",
    category: "application",
  },
  { type: "DNS", description: "Domain Name System", category: "application" },
  {
    type: "DHCP",
    description: "Dynamic Host Configuration Protocol",
    category: "application",
  },
  { type: "SSH", description: "Secure Shell", category: "application" },
  { type: "TELNET", description: "Telnet Protocol", category: "application" },
  {
    type: "SNMP",
    description: "Simple Network Management Protocol",
    category: "application",
  },

  // 隧道协议
  { type: "SOCKS", description: "SOCKS Proxy Protocol", category: "tunnel" },
  { type: "SOCKS4", description: "SOCKS Version 4", category: "tunnel" },
  { type: "SOCKS5", description: "SOCKS Version 5", category: "tunnel" },
  { type: "TUN", description: "TUN Interface", category: "tunnel" },
  { type: "TAP", description: "TAP Interface", category: "tunnel" },
  { type: "VPN", description: "Virtual Private Network", category: "tunnel" },
  {
    type: "PPTP",
    description: "Point-to-Point Tunneling Protocol",
    category: "tunnel",
  },
  {
    type: "L2TP",
    description: "Layer 2 Tunneling Protocol",
    category: "tunnel",
  },
  {
    type: "IPSEC",
    description: "Internet Protocol Security",
    category: "tunnel",
  },
];

// GeoIP IP 到国家代码映射（预置数据）
export const IP_TO_COUNTRY_MAP: Record<string, string> = {
  "1.0.0.0": "AU", // Cloudflare DNS
  "1.0.0.1": "US",
  "1.1.1.1": "US",
  "8.8.8.8": "US", // Google DNS
  "8.8.4.4": "US",
  "10.0.0.1": "PRIVATE", // Private network
  "10.0.0.2": "PRIVATE",
  "10.255.255.254": "PRIVATE",
  "100.64.0.0": "SHARED", // Shared Address Space
  "100.64.0.1": "SHARED",
  "114.114.114.114": "CN", // China Telecom DNS
  "119.29.29.29": "CN", // Tencent DNS
  "127.0.0.1": "LOCAL", // Loopback
  "172.16.0.1": "PRIVATE", // Private network
  "172.31.255.254": "PRIVATE",
  "192.168.0.1": "PRIVATE", // Private network
  "192.168.1.1": "PRIVATE",
  "203.0.113.1": "DOC_TEST", // Documentation/Example
  "203.0.113.254": "DOC_TEST",
  "223.5.5.5": "CN", // Alibaba DNS
  "223.6.6.6": "CN", // Alibaba DNS
  "208.67.222.222": "US", // OpenDNS
  "208.67.220.220": "US",
  "9.9.9.9": "US", // Quad9 DNS
  "149.112.112.112": "US",
  "45.33.32.1": "US", // Linode
  "45.79.0.1": "US", // Linode
  "139.162.0.1": "SG", // Linode Singapore
  "172.104.0.1": "JP", // Linode Japan
  "104.16.0.0": "US", // Cloudflare CDN
  "104.16.255.255": "US",
  "185.199.108.153": "US", // GitHub Pages
  "185.199.109.153": "US",
  "185.199.110.153": "US",
  "185.199.111.153": "US",
};

// GeoSite 域名类别映射（预置数据）
export const GEOSITE_CATEGORIES: Record<string, string[]> = {
  "google": [
    "google.com",
    "google.com.hk",
    "google.cn",
    "youtube.com",
    "youtu.be",
    "googlevideo.com",
    "gstatic.com",
    "googleapis.com",
    "googleusercontent.com",
    "g.co",
    "ggpht.com",
    "android.com",
    "chrome.com",
    "firebase.com",
    "gvt1.com",
    "recaptcha.net",
  ],
  "facebook": [
    "facebook.com",
    "fb.com",
    "fbcdn.net",
    "instagram.com",
    "whatsapp.com",
    "messenger.com",
    "oculus.com",
    "facebook.net",
  ],
  "microsoft": [
    "microsoft.com",
    "office.com",
    "outlook.com",
    "live.com",
    "msn.com",
    "bing.com",
    "azure.com",
    "windows.com",
    "xbox.com",
    "skype.com",
    "onedrive.com",
    "github.com",
    "visualstudio.com",
  ],
  "apple": [
    "apple.com",
    "icloud.com",
    "itunes.com",
    "mac.com",
    "me.com",
    "cdn-apple.com",
    "apple-cloud.com",
    "mzstatic.com",
  ],
  "cn": [
    "baidu.com",
    "qq.com",
    "weibo.com",
    "taobao.com",
    "tmall.com",
    "jd.com",
    "alipay.com",
    "wechat.com",
    "sogou.com",
    "sohu.com",
    "163.com",
    "qq.cn",
    "sina.com.cn",
    "tencent.com",
    "alibaba.com",
    "alicdn.com",
    "bilibili.com",
    "douyin.com",
    "kuaishou.com",
    "iqiyi.com",
    "youku.com",
    "toutiao.com",
  ],
  "streaming": [
    "netflix.com",
    "hulu.com",
    "disneyplus.com",
    "primevideo.com",
    "hbomax.com",
    "spotify.com",
    "pandora.com",
    "tidal.com",
    "appletv.com",
  ],
  "game": [
    "steamgames.com",
    "steampowered.com",
    "epicgames.com",
    "blizzard.com",
    "riotgames.com",
    "valve.com",
    "origin.com",
    "ubisoft.com",
  ],
  "ads": [
    "ad.com",
    "ads.com",
    "admob.com",
    "doubleclick.net",
    "googleadservices.com",
    "googlesyndication.com",
    "adservice.google.com",
    "analytics.google.com",
    "facebook.ads",
    "tracking.com",
  ],
};

// 常用域名后缀
export const COMMON_DOMAIN_SUFFIXES = [
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "mil",
  "int",
  "cn",
  "jp",
  "kr",
  "hk",
  "tw",
  "sg",
  "my",
  "th",
  "id",
  "ph",
  "vn",
  "us",
  "ca",
  "mx",
  "br",
  "ar",
  "uk",
  "de",
  "fr",
  "it",
  "es",
  "nl",
  "ch",
  "se",
  "no",
  "fi",
  "dk",
  "ru",
  "au",
  "nz",
  "io",
  "co",
  "me",
  "tv",
  "cc",
  "biz",
  "info",
  "name",
  "pro",
];

// 常用端口号
export const COMMON_PORTS = [
  { port: 21, description: "FTP", category: "file" },
  { port: 22, description: "SSH", category: "remote" },
  { port: 23, description: "Telnet", category: "remote" },
  { port: 25, description: "SMTP", category: "mail" },
  { port: 53, description: "DNS", category: "system" },
  { port: 80, description: "HTTP", category: "web" },
  { port: 110, description: "POP3", category: "mail" },
  { port: 143, description: "IMAP", category: "mail" },
  { port: 443, description: "HTTPS", category: "web" },
  { port: 993, description: "IMAPS", category: "mail" },
  { port: 995, description: "POP3S", category: "mail" },
  { port: 1080, description: "SOCKS", category: "proxy" },
  { port: 3128, description: "HTTP Proxy", category: "proxy" },
  { port: 8080, description: "HTTP Alt", category: "web" },
  { port: 8443, description: "HTTPS Alt", category: "web" },
  { port: 9050, description: "Tor SOCKS", category: "proxy" },
];

// 常用进程名称
export const COMMON_PROCESSES = [
  // 浏览器
  "chrome.exe",
  "firefox.exe",
  "edge.exe",
  "safari.exe",
  "opera.exe",
  "brave.exe",
  "chromium.exe",
  "vivaldi.exe",
  "waterfox.exe",

  // 系统进程
  "system",
  "svchost.exe",
  "explorer.exe",
  "winlogon.exe",
  "csrss.exe",
  "lsass.exe",
  "services.exe",
  "smss.exe",
  "wininit.exe",

  // 网络工具
  "curl.exe",
  "wget.exe",
  "aria2c.exe",
  "thunder.exe",
  "qbittorrent.exe",
  "utorrent.exe",
  "bittorrent.exe",
  "transmission.exe",

  // 通讯软件
  "wechat.exe",
  "qq.exe",
  "telegram.exe",
  "discord.exe",
  "slack.exe",
  "teams.exe",
  "zoom.exe",
  "skype.exe",
  "whatsapp.exe",

  // 开发工具
  "code.exe",
  "devenv.exe",
  "idea64.exe",
  "pycharm64.exe",
  "webstorm64.exe",
  "sublime_text.exe",
  "notepad++.exe",
  "atom.exe",

  // 游戏平台
  "steam.exe",
  "epicgameslauncher.exe",
  "origin.exe",
  "uplay.exe",
  "battlenet.exe",
  "gog.exe",
  "minecraft.exe",
];

// 数据获取函数
export class ClashDataSources {
  static getPolicies(): PolicyData[] {
    return [...BUILT_IN_POLICIES];
  }

  static getGeoIPCountries(popularOnly = false): GeoIPCountryData[] {
    return popularOnly
      ? GEOIP_COUNTRIES.filter((c) => c.popular)
      : GEOIP_COUNTRIES;
  }

  static getNetworkTypes(category?: string): NetworkTypeData[] {
    return category
      ? NETWORK_TYPES.filter((n) => n.category === category)
      : NETWORK_TYPES;
  }

  static getCommonPorts(category?: string): typeof COMMON_PORTS {
    return category
      ? COMMON_PORTS.filter((p) => p.category === category)
      : COMMON_PORTS;
  }

  static getCommonProcesses(): string[] {
    return [...COMMON_PROCESSES];
  }

  static getCommonDomainSuffixes(): string[] {
    return [...COMMON_DOMAIN_SUFFIXES];
  }

  // 搜索功能
  static searchCountries(query: string): GeoIPCountryData[] {
    const lowerQuery = query.toLowerCase();
    return GEOIP_COUNTRIES.filter((country) =>
      country.code.toLowerCase().includes(lowerQuery) ||
      country.name.toLowerCase().includes(lowerQuery)
    );
  }

  static searchNetworkTypes(query: string): NetworkTypeData[] {
    const lowerQuery = query.toLowerCase();
    return NETWORK_TYPES.filter((network) =>
      network.type.toLowerCase().includes(lowerQuery) ||
      network.description.toLowerCase().includes(lowerQuery)
    );
  }

  static searchProcesses(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    return COMMON_PROCESSES.filter((process) =>
      process.toLowerCase().includes(lowerQuery)
    );
  }
}

// 为了向后兼容，导出 POLICIES 别名
export const POLICIES = BUILT_IN_POLICIES;
