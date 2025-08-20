"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, HelpCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RULE_TYPES = [
  {
    type: "DOMAIN",
    description: "精确域名匹配",
    example: "DOMAIN,www.google.com,PROXY",
    explanation: "精确匹配 www.google.com",
  },
  {
    type: "DOMAIN-SUFFIX",
    description: "域名后缀匹配",
    example: "DOMAIN-SUFFIX,google.com,PROXY",
    explanation: "匹配 google.com 及其所有子域名",
  },
  {
    type: "DOMAIN-KEYWORD",
    description: "域名关键词匹配",
    example: "DOMAIN-KEYWORD,google,PROXY",
    explanation: "匹配包含 'google' 的任何域名",
  },
  {
    type: "IP-CIDR",
    description: "IPv4 CIDR 范围匹配",
    example: "IP-CIDR,192.168.0.0/16,DIRECT",
    explanation: "匹配 192.168.x.x 范围内的所有 IP",
  },
  {
    type: "IP-CIDR6",
    description: "IPv6 CIDR 范围匹配",
    example: "IP-CIDR6,2001:db8::/32,DIRECT",
    explanation: "匹配指定范围内的 IPv6 地址",
  },
  {
    type: "GEOIP",
    description: "地理位置 IP 匹配",
    example: "GEOIP,US,PROXY",
    explanation: "匹配地理位置为美国的 IP",
  },
  {
    type: "PROCESS-NAME",
    description: "进程名匹配",
    example: "PROCESS-NAME,chrome.exe,PROXY",
    explanation: "匹配来自 Chrome 浏览器请求",
  },
  {
    type: "PROCESS-PATH",
    description: "进程路径匹配",
    example: "PROCESS-PATH,/usr/bin/chrome,PROXY",
    explanation: "匹配来自特定进程路径的请求",
  },
  {
    type: "DST-PORT",
    description: "目标端口匹配",
    example: "DST-PORT,443,PROXY",
    explanation: "匹配 HTTPS 流量（443 端口）",
  },
  {
    type: "MATCH",
    description: "默认兜底规则",
    example: "MATCH,PROXY",
    explanation: "捕获所有未匹配的请求（必须放在最后）",
  },
];

const POLICIES = [
  {
    name: "DIRECT",
    description: "直接连接，不使用代理",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    name: "PROXY",
    description: "通过代理服务器路由",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    name: "REJECT",
    description: "阻止连接",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
];

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <HelpCircle className="h-4 w-4 mr-2" />
          快速参考
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            CLASH 规则快速参考
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">规则类型</CardTitle>
              <CardDescription>
                CLASH 支持各种规则类型来适应不同的匹配场景
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {RULE_TYPES.map((rule) => (
                  <div key={rule.type} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {rule.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {rule.description}
                      </span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 mb-2">
                      <code className="text-sm">{rule.example}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rule.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">策略</CardTitle>
              <CardDescription>当规则匹配时可以采取的动作</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {POLICIES.map((policy) => (
                  <div key={policy.name} className="flex items-center gap-3">
                    <Badge className={policy.color}>{policy.name}</Badge>
                    <span className="text-sm">{policy.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">最佳实践</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">顺序很重要</p>
                  <p className="text-sm text-muted-foreground">
                    规则从上到下处理。更具体的规则应该放在前面。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">始终以 MATCH 结尾</p>
                  <p className="text-sm text-muted-foreground">
                    在最后包含一个 MATCH 规则来处理未匹配的请求。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">使用注释</p>
                  <p className="text-sm text-muted-foreground">
                    使用#添加注释来组织和记录您的规则。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">测试您的规则</p>
                  <p className="text-sm text-muted-foreground">
                    使用此工具在部署前验证您的规则是否按预期工作。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              更多信息，请访问官方 CLASH 文档
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://wiki.metacubex.one/config/rules/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                官方文档
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
