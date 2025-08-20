"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Keyboard, Loader2, Play, Plus, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EnabledTestItems {
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

interface RuleTesterProps {
    // Test values
    testDomain: string;
    setTestDomain: (value: string) => void;
    testSrcIPv4: string;
    setTestSrcIPv4: (value: string) => void;
    testSrcIPv6: string;
    setTestSrcIPv6: (value: string) => void;
    testSrcPort: string;
    setTestSrcPort: (value: string) => void;
    testDstIPv4: string;
    setTestDstIPv4: (value: string) => void;
    testDstIPv6: string;
    setTestDstIPv6: (value: string) => void;
    testDstPort: string;
    setTestDstPort: (value: string) => void;
    testProcess: string;
    setTestProcess: (value: string) => void;
    testProcessPath: string;
    setTestProcessPath: (value: string) => void;
    testGeoIP: string;
    setTestGeoIP: (value: string) => void;
    testNetwork: string;
    setTestNetwork: (value: string) => void;
    testUID: string;
    setTestUID: (value: string) => void;

    // Enabled items
    enabledTestItems: EnabledTestItems;
    setEnabledTestItems: (
        items:
            | EnabledTestItems
            | ((prev: EnabledTestItems) => EnabledTestItems),
    ) => void;

    // IP types
    srcIPType: "ipv4" | "ipv6" | "both";
    setSrcIPType: (type: "ipv4" | "ipv6" | "both") => void;
    dstIPType: "ipv4" | "ipv6" | "both";
    setDstIPType: (type: "ipv4" | "ipv6" | "both") => void;

    // Auto test
    autoTest: boolean;
    setAutoTest: (value: boolean) => void;
    autoTestDelayMs: number;
    setAutoTestDelayMs: (value: number) => void;

    // Test function
    onTestRules: () => void;
    isTestingInProgress: boolean;

    // Data sources
    geoIPCountries: string[];
    networkTypes: string[];
    onAddCountry: () => void;
    onRemoveCountry: (country: string) => void;
    onAddNetworkType: () => void;
    onRemoveNetworkType: (type: string) => void;
    newCountryCode: string;
    setNewCountryCode: (value: string) => void;
    newNetworkType: string;
    setNewNetworkType: (value: string) => void;
}

export function RuleTester({
    testDomain,
    setTestDomain,
    testSrcIPv4,
    setTestSrcIPv4,
    testSrcIPv6,
    setTestSrcIPv6,
    testSrcPort,
    setTestSrcPort,
    testDstIPv4,
    setTestDstIPv4,
    testDstIPv6,
    setTestDstIPv6,
    testDstPort,
    setTestDstPort,
    testProcess,
    setTestProcess,
    testProcessPath,
    setTestProcessPath,
    testGeoIP,
    setTestGeoIP,
    testNetwork,
    setTestNetwork,
    testUID,
    setTestUID,
    enabledTestItems,
    setEnabledTestItems,
    srcIPType,
    setSrcIPType,
    dstIPType,
    setDstIPType,
    autoTest,
    setAutoTest,
    autoTestDelayMs,
    setAutoTestDelayMs,
    onTestRules,
    isTestingInProgress,
    geoIPCountries,
    networkTypes,
    onAddCountry,
    onRemoveCountry,
    onAddNetworkType,
    onRemoveNetworkType,
    newCountryCode,
    setNewCountryCode,
    newNetworkType,
    setNewNetworkType,
}: RuleTesterProps) {
    const { toast } = useToast();

    return (
        <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Play className="h-4 w-4" />
                        测试请求
                    </h3>
                    <div className="flex items-center gap-2">
                        <Toggle
                            pressed={autoTest}
                            onPressedChange={setAutoTest}
                            className="auto-test-toggle h-7 px-2 text-xs rounded-md"
                            aria-label="自动测试"
                        >
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                        </Toggle>
                        <Badge variant="outline" className="text-xs rounded-md">
                            <Keyboard className="h-3 w-3 mr-1" />
                            Ctrl+Enter
                        </Badge>
                    </div>
                </div>
                {!autoTest
                    ? (
                        <Button
                            onClick={onTestRules}
                            className="mt-3 space-y-2 w-full hover:scale-[1.02] hover:shadow-sm transition-all duration-200 rounded-md"
                            disabled={isTestingInProgress}
                        >
                            {isTestingInProgress
                                ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )
                                : <Play className="h-4 w-4 mr-2" />}
                            测试规则
                        </Button>
                    )
                    : (
                        <div className="mt-3 space-y-2">
                            <Label className="text-xs">
                                自动测试延迟：{autoTestDelayMs}ms
                            </Label>
                            <Slider
                                value={[autoTestDelayMs]}
                                onValueChange={([value]) =>
                                    setAutoTestDelayMs(value)}
                                min={100}
                                max={2000}
                                step={100}
                                className="w-full"
                            />
                        </div>
                    )}
            </div>
            <div className="p-4 space-y-4">
                {/* Domain */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="enable-domain"
                        checked={enabledTestItems.domain}
                        onCheckedChange={(checked) =>
                            setEnabledTestItems((prev) => ({
                                ...prev,
                                domain: !!checked,
                            }))}
                    />
                    <Label
                        htmlFor="enable-domain"
                        className="text-foreground text-sm min-w-[60px]"
                    >
                        域名：
                    </Label>
                    <Input
                        id="test-domain"
                        value={testDomain}
                        onChange={(e) => setTestDomain(e.target.value)}
                        placeholder="www.example.com"
                        className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        disabled={!enabledTestItems.domain}
                    />
                </div>

                {/* Source IP Configuration */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="enable-src-ip"
                                checked={enabledTestItems.srcIP}
                                onCheckedChange={(checked) =>
                                    setEnabledTestItems((prev) => ({
                                        ...prev,
                                        srcIP: !!checked,
                                    }))}
                            />
                            <Label className="text-foreground min-w-fit">
                                源 IP:
                            </Label>
                        </div>
                        <Select
                            value={srcIPType}
                            onValueChange={(value: "ipv4" | "ipv6" | "both") =>
                                setSrcIPType(value)}
                        >
                            <SelectTrigger className="w-32 hover:bg-accent/60 transition-colors rounded-md">
                                <SelectValue placeholder="类型" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ipv4">IPv4</SelectItem>
                                <SelectItem value="ipv6">IPv6</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        {(srcIPType === "ipv4" || srcIPType === "both") && (
                            <Input
                                value={testSrcIPv4}
                                onChange={(e) => setTestSrcIPv4(e.target.value)}
                                placeholder="192.168.1.100"
                                className="hover:bg-accent/60 transition-colors rounded-md"
                                disabled={!enabledTestItems.srcIP}
                            />
                        )}
                        {(srcIPType === "ipv6" || srcIPType === "both") && (
                            <Input
                                value={testSrcIPv6}
                                onChange={(e) => setTestSrcIPv6(e.target.value)}
                                placeholder="2001:db8::1"
                                className="hover:bg-accent/60 transition-colors rounded-md"
                                disabled={!enabledTestItems.srcIP}
                            />
                        )}
                    </div>
                </div>

                {/* Source Port */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="enable-src-port"
                        checked={enabledTestItems.srcPort}
                        onCheckedChange={(checked) =>
                            setEnabledTestItems((prev) => ({
                                ...prev,
                                srcPort: !!checked,
                            }))}
                    />
                    <Label
                        htmlFor="enable-src-port"
                        className="text-foreground text-sm min-w-[80px]"
                    >
                        源端口：
                    </Label>
                    <Input
                        id="test-src-port"
                        value={testSrcPort}
                        onChange={(e) => setTestSrcPort(e.target.value)}
                        placeholder="12345"
                        className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        disabled={!enabledTestItems.srcPort}
                    />
                </div>

                {/* Destination IP Configuration */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="enable-dst-ip"
                                checked={enabledTestItems.dstIP}
                                onCheckedChange={(checked) =>
                                    setEnabledTestItems((prev) => ({
                                        ...prev,
                                        dstIP: !!checked,
                                    }))}
                            />
                            <Label className="text-foreground min-w-fit">
                                目标 IP:
                            </Label>
                        </div>
                        <Select
                            value={dstIPType}
                            onValueChange={(value: "ipv4" | "ipv6" | "both") =>
                                setDstIPType(value)}
                        >
                            <SelectTrigger className="w-32 hover:bg-accent/60 transition-colors rounded-md">
                                <SelectValue placeholder="类型" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ipv4">IPv4</SelectItem>
                                <SelectItem value="ipv6">IPv6</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        {(dstIPType === "ipv4" || dstIPType === "both") && (
                            <Input
                                value={testDstIPv4}
                                onChange={(e) => setTestDstIPv4(e.target.value)}
                                placeholder="8.8.8.8"
                                className="hover:bg-accent/60 transition-colors rounded-md"
                                disabled={!enabledTestItems.dstIP}
                            />
                        )}
                        {(dstIPType === "ipv6" || dstIPType === "both") && (
                            <Input
                                value={testDstIPv6}
                                onChange={(e) => setTestDstIPv6(e.target.value)}
                                placeholder="2001:4860:4860::8888"
                                className="hover:bg-accent/60 transition-colors rounded-md"
                                disabled={!enabledTestItems.dstIP}
                            />
                        )}
                    </div>
                </div>

                {/* Destination Port */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="enable-dst-port"
                        checked={enabledTestItems.dstPort}
                        onCheckedChange={(checked) =>
                            setEnabledTestItems((prev) => ({
                                ...prev,
                                dstPort: !!checked,
                            }))}
                    />
                    <Label
                        htmlFor="enable-dst-port"
                        className="text-foreground text-sm min-w-[80px]"
                    >
                        目标端口：
                    </Label>
                    <Input
                        id="test-dst-port"
                        value={testDstPort}
                        onChange={(e) => setTestDstPort(e.target.value)}
                        placeholder="443"
                        className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        disabled={!enabledTestItems.dstPort}
                    />
                </div>

                {/* Process */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="enable-process"
                        checked={enabledTestItems.process}
                        onCheckedChange={(checked) =>
                            setEnabledTestItems((prev) => ({
                                ...prev,
                                process: !!checked,
                            }))}
                    />
                    <Label
                        htmlFor="enable-process"
                        className="text-foreground text-sm min-w-[60px]"
                    >
                        进程：
                    </Label>
                    <Input
                        id="test-process"
                        value={testProcess}
                        onChange={(e) => setTestProcess(e.target.value)}
                        placeholder="chrome.exe"
                        className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        disabled={!enabledTestItems.process}
                    />
                </div>

                {/* Process Path */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="enable-process-path"
                        checked={enabledTestItems.processPath}
                        onCheckedChange={(checked) =>
                            setEnabledTestItems((prev) => ({
                                ...prev,
                                processPath: !!checked,
                            }))}
                    />
                    <Label
                        htmlFor="enable-process-path"
                        className="text-foreground text-sm min-w-[80px]"
                    >
                        进程路径：
                    </Label>
                    <Input
                        id="test-process-path"
                        value={testProcessPath}
                        onChange={(e) => setTestProcessPath(e.target.value)}
                        placeholder="/usr/bin/chrome"
                        className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        disabled={!enabledTestItems.processPath}
                    />
                </div>

                {/* GeoIP Country */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="enable-geoip"
                            checked={enabledTestItems.geoIP}
                            onCheckedChange={(checked) =>
                                setEnabledTestItems((prev) => ({
                                    ...prev,
                                    geoIP: !!checked,
                                }))}
                        />
                        <Label
                            htmlFor="enable-geoip"
                            className="text-foreground"
                        >
                            GeoIP 国家
                        </Label>

                        {/* 国家选择器 */}
                        <Select
                            value={testGeoIP}
                            onValueChange={setTestGeoIP}
                            disabled={!enabledTestItems.geoIP}
                        >
                            <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md flex-1">
                                <SelectValue placeholder="选择国家" />
                            </SelectTrigger>
                            <SelectContent>
                                {geoIPCountries.map((country) => (
                                    <SelectItem key={country} value={country}>
                                        {country}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 国家代码管理 */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                value={newCountryCode}
                                onChange={(e) =>
                                    setNewCountryCode(e.target.value)}
                                placeholder="输入国家代码"
                                className="flex-1 rounded-md text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        onAddCountry();
                                    }
                                }}
                            />
                            <Button
                                onClick={onAddCountry}
                                size="sm"
                                disabled={!newCountryCode.trim()}
                                className="px-3 rounded-md"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {geoIPCountries.map((country) => (
                                <Badge
                                    key={country}
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-destructive/20"
                                    onClick={() => onRemoveCountry(country)}
                                >
                                    {country} ×
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Network Type */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="enable-network"
                            checked={enabledTestItems.network}
                            onCheckedChange={(checked) =>
                                setEnabledTestItems((prev) => ({
                                    ...prev,
                                    network: !!checked,
                                }))}
                        />
                        <Label
                            htmlFor="enable-network"
                            className="text-foreground"
                        >
                            网络类型
                        </Label>

                        {/* 网络类型选择器 */}
                        <Select
                            value={testNetwork}
                            onValueChange={setTestNetwork}
                            disabled={!enabledTestItems.network}
                        >
                            <SelectTrigger className="hover:bg-accent/60 transition-colors rounded-md flex-1">
                                <SelectValue placeholder="选择网络类型" />
                            </SelectTrigger>
                            <SelectContent>
                                {networkTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 网络类型管理 */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                value={newNetworkType}
                                onChange={(e) =>
                                    setNewNetworkType(e.target.value)}
                                placeholder="输入网络类型"
                                className="flex-1 rounded-md text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        onAddNetworkType();
                                    }
                                }}
                            />
                            <Button
                                onClick={onAddNetworkType}
                                size="sm"
                                disabled={!newNetworkType.trim()}
                                className="px-3 rounded-md"
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {networkTypes.map((type) => (
                                <Badge
                                    key={type}
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-destructive/20"
                                    onClick={() => onRemoveNetworkType(type)}
                                >
                                    {type} ×
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* UID */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="enable-uid"
                        checked={enabledTestItems.uid}
                        onCheckedChange={(checked) =>
                            setEnabledTestItems((prev) => ({
                                ...prev,
                                uid: !!checked,
                            }))}
                    />
                    <Label
                        htmlFor="enable-uid"
                        className="text-foreground text-sm min-w-[80px]"
                    >
                        用户 ID:
                    </Label>
                    <Input
                        id="test-uid"
                        value={testUID}
                        onChange={(e) => setTestUID(e.target.value)}
                        placeholder="1000"
                        className="hover:bg-accent/60 transition-colors rounded-md flex-1"
                        disabled={!enabledTestItems.uid}
                    />
                </div>
            </div>
        </div>
    );
}
