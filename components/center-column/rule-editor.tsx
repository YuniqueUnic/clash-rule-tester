"use client";

import { ClashRuleEditor } from "@/components/clash-rule-editor";

interface Policy {
    id: string;
    name: string;
    comment?: string;
}

interface RuleEditorProps {
    rules: string;
    onRulesChange: (rules: string) => void;
    highlightedLine?: number;
    ruleCount?: number;
    hasError?: boolean;
    errorCount?: number;
    policies: Policy[];
    geoIPCountries: string[];
    networkTypes: string[];
    currentGeoIPCountries?: string[];
    currentNetworkTypes?: string[];
}

export function RuleEditor({
    rules,
    onRulesChange,
    highlightedLine,
    ruleCount,
    hasError,
    errorCount,
    policies,
    geoIPCountries,
    networkTypes,
    currentGeoIPCountries,
    currentNetworkTypes,
}: RuleEditorProps) {
    return (
        <div className="h-full">
            <ClashRuleEditor
                value={rules}
                onChange={onRulesChange}
                highlightedLine={highlightedLine}
                className="h-full"
                ruleCount={ruleCount}
                hasError={hasError}
                errorCount={errorCount}
                policies={policies.map((p) => p.name)}
                geoIPCountries={geoIPCountries}
                networkTypes={networkTypes}
                currentGeoIPCountries={currentGeoIPCountries}
                currentNetworkTypes={currentNetworkTypes}
            />
        </div>
    );
}
