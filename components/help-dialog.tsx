"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HelpCircle, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const RULE_TYPES = [
  {
    type: "DOMAIN",
    description: "Exact domain match",
    example: "DOMAIN,www.google.com,PROXY",
    explanation: "Matches exactly www.google.com",
  },
  {
    type: "DOMAIN-SUFFIX",
    description: "Domain suffix match",
    example: "DOMAIN-SUFFIX,google.com,PROXY",
    explanation: "Matches google.com and all its subdomains",
  },
  {
    type: "DOMAIN-KEYWORD",
    description: "Domain keyword match",
    example: "DOMAIN-KEYWORD,google,PROXY",
    explanation: "Matches any domain containing 'google'",
  },
  {
    type: "IP-CIDR",
    description: "IPv4 CIDR range match",
    example: "IP-CIDR,192.168.0.0/16,DIRECT",
    explanation: "Matches all IPs in the 192.168.x.x range",
  },
  {
    type: "IP-CIDR6",
    description: "IPv6 CIDR range match",
    example: "IP-CIDR6,2001:db8::/32,DIRECT",
    explanation: "Matches IPv6 addresses in the specified range",
  },
  {
    type: "GEOIP",
    description: "Geographic IP match",
    example: "GEOIP,US,PROXY",
    explanation: "Matches IPs geolocated to the United States",
  },
  {
    type: "PROCESS-NAME",
    description: "Process name match",
    example: "PROCESS-NAME,chrome.exe,PROXY",
    explanation: "Matches requests from Chrome browser",
  },
  {
    type: "PROCESS-PATH",
    description: "Process path match",
    example: "PROCESS-PATH,/usr/bin/chrome,PROXY",
    explanation: "Matches requests from specific process path",
  },
  {
    type: "DST-PORT",
    description: "Destination port match",
    example: "DST-PORT,443,PROXY",
    explanation: "Matches HTTPS traffic (port 443)",
  },
  {
    type: "MATCH",
    description: "Default fallback rule",
    example: "MATCH,PROXY",
    explanation: "Catches all unmatched requests (must be last)",
  },
]

const POLICIES = [
  {
    name: "DIRECT",
    description: "Connect directly without proxy",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  {
    name: "PROXY",
    description: "Route through proxy server",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    name: "REJECT",
    description: "Block the connection",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
]

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <HelpCircle className="h-4 w-4 mr-2" />
          Quick Reference
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            CLASH Rules Quick Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Rule Types</CardTitle>
              <CardDescription>CLASH supports various rule types for different matching scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {RULE_TYPES.map((rule) => (
                  <div key={rule.type} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {rule.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{rule.description}</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 mb-2">
                      <code className="text-sm">{rule.example}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Policies</CardTitle>
              <CardDescription>Actions that can be taken when a rule matches</CardDescription>
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
              <CardTitle className="text-lg">Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Order matters</p>
                  <p className="text-sm text-muted-foreground">
                    Rules are processed top to bottom. More specific rules should come first.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Always end with MATCH</p>
                  <p className="text-sm text-muted-foreground">
                    Include a MATCH rule at the end to handle unmatched requests.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Use comments</p>
                  <p className="text-sm text-muted-foreground">
                    Add comments with # to organize and document your rules.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Test your rules</p>
                  <p className="text-sm text-muted-foreground">
                    Use this tool to verify your rules work as expected before deployment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              For more information, visit the official CLASH documentation
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://wiki.metacubex.one/config/rules/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Official Docs
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
