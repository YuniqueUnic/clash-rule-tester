"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";

// ASN 表单数据接口
export interface ASNFormData {
  ip: string;
  asn: string;
}

// ASN 添加表单
export function ASNAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: ASNFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<ASNFormData>({
    ip: "",
    asn: "",
  });

  const [errors, setErrors] = useState<Partial<ASNFormData>>({});

  const validateIP = (ip: string) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const validateASN = (asn: string) => {
    return /^AS\d+$/i.test(asn);
  };

  const validateForm = () => {
    const newErrors: Partial<ASNFormData> = {};
    
    if (!formData.ip.trim()) {
      newErrors.ip = "IP地址不能为空";
    } else if (!validateIP(formData.ip.trim())) {
      newErrors.ip = "请输入有效的IPv4或IPv6地址";
    }
    
    if (!formData.asn.trim()) {
      newErrors.asn = "ASN不能为空";
    } else if (!validateASN(formData.asn.trim())) {
      newErrors.asn = "ASN格式应为 AS + 数字，例如: AS15169";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ip: formData.ip.trim(),
        asn: formData.asn.trim().toUpperCase(),
      });
    }
  };

  const handleASNChange = (value: string) => {
    let asn = value.toUpperCase();
    if (asn && !asn.startsWith("AS")) {
      asn = "AS" + asn.replace(/^AS/i, "");
    }
    setFormData({ ...formData, asn });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="asn-ip">IP地址 *</Label>
        <Input
          id="asn-ip"
          value={formData.ip}
          onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
          placeholder="例如: 8.8.8.8 或 2001:4860:4860::8888"
          className={errors.ip ? "border-destructive" : ""}
        />
        {errors.ip && (
          <p className="text-sm text-destructive">{errors.ip}</p>
        )}
        <p className="text-xs text-muted-foreground">
          支持IPv4和IPv6地址格式
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="asn-number">ASN编号 *</Label>
        <Input
          id="asn-number"
          value={formData.asn}
          onChange={(e) => handleASNChange(e.target.value)}
          placeholder="例如: AS15169"
          className={errors.asn ? "border-destructive" : ""}
        />
        {errors.asn && (
          <p className="text-sm text-destructive">{errors.asn}</p>
        )}
        <p className="text-xs text-muted-foreground">
          自治系统编号，格式为AS + 数字
        </p>
      </div>

      <div className="p-3 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">
          <strong>常见ASN示例:</strong><br />
          • AS15169 - Google<br />
          • AS13335 - Cloudflare<br />
          • AS4134 - China Telecom<br />
          • AS37963 - Alibaba
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">添加ASN映射</Button>
      </DialogFooter>
    </form>
  );
}

// ASN 编辑表单
export function ASNEditForm({
  asnData,
  onSubmit,
  onCancel,
}: {
  asnData: { id: string; ip: string; asn: string };
  onSubmit: (data: Partial<ASNFormData>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<ASNFormData>({
    ip: asnData.ip,
    asn: asnData.asn,
  });

  const [errors, setErrors] = useState<Partial<ASNFormData>>({});

  const validateIP = (ip: string) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const validateASN = (asn: string) => {
    return /^AS\d+$/i.test(asn);
  };

  const validateForm = () => {
    const newErrors: Partial<ASNFormData> = {};
    
    if (!formData.ip.trim()) {
      newErrors.ip = "IP地址不能为空";
    } else if (!validateIP(formData.ip.trim())) {
      newErrors.ip = "请输入有效的IPv4或IPv6地址";
    }
    
    if (!formData.asn.trim()) {
      newErrors.asn = "ASN不能为空";
    } else if (!validateASN(formData.asn.trim())) {
      newErrors.asn = "ASN格式应为 AS + 数字，例如: AS15169";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ip: formData.ip.trim(),
        asn: formData.asn.trim().toUpperCase(),
      });
    }
  };

  const handleASNChange = (value: string) => {
    let asn = value.toUpperCase();
    if (asn && !asn.startsWith("AS")) {
      asn = "AS" + asn.replace(/^AS/i, "");
    }
    setFormData({ ...formData, asn });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-asn-ip">IP地址 *</Label>
        <Input
          id="edit-asn-ip"
          value={formData.ip}
          onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
          placeholder="例如: 8.8.8.8 或 2001:4860:4860::8888"
          className={errors.ip ? "border-destructive" : ""}
        />
        {errors.ip && (
          <p className="text-sm text-destructive">{errors.ip}</p>
        )}
        <p className="text-xs text-muted-foreground">
          支持IPv4和IPv6地址格式
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-asn-number">ASN编号 *</Label>
        <Input
          id="edit-asn-number"
          value={formData.asn}
          onChange={(e) => handleASNChange(e.target.value)}
          placeholder="例如: AS15169"
          className={errors.asn ? "border-destructive" : ""}
        />
        {errors.asn && (
          <p className="text-sm text-destructive">{errors.asn}</p>
        )}
        <p className="text-xs text-muted-foreground">
          自治系统编号，格式为AS + 数字
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">保存更改</Button>
      </DialogFooter>
    </form>
  );
}

// ASN 批量导入表单
export function ASNBulkImportForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: ASNFormData[]) => void;
  onCancel: () => void;
}) {
  const [bulkData, setBulkData] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const validateAndParseBulkData = (data: string): ASNFormData[] => {
    const lines = data.split('\n').filter(line => line.trim());
    const results: ASNFormData[] = [];
    const newErrors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(/[,\t\s]+/);
      if (parts.length !== 2) {
        newErrors.push(`第${index + 1}行: 格式错误，应为 "IP ASN"`);
        return;
      }

      const [ip, asn] = parts;
      
      // 验证IP
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
      
      if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
        newErrors.push(`第${index + 1}行: IP地址格式错误`);
        return;
      }

      // 验证ASN
      let normalizedASN = asn.toUpperCase();
      if (!normalizedASN.startsWith("AS")) {
        normalizedASN = "AS" + normalizedASN;
      }
      
      if (!/^AS\d+$/.test(normalizedASN)) {
        newErrors.push(`第${index + 1}行: ASN格式错误`);
        return;
      }

      results.push({ ip, asn: normalizedASN });
    });

    setErrors(newErrors);
    return results;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedData = validateAndParseBulkData(bulkData);
    if (errors.length === 0 && parsedData.length > 0) {
      onSubmit(parsedData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bulk-asn-data">批量ASN数据 *</Label>
        <Textarea
          id="bulk-asn-data"
          value={bulkData}
          onChange={(e) => setBulkData(e.target.value)}
          placeholder="每行一个IP和ASN映射，用空格或制表符分隔&#10;例如:&#10;8.8.8.8 AS15169&#10;1.1.1.1 AS13335&#10;114.114.114.114 AS4134"
          rows={8}
          className={errors.length > 0 ? "border-destructive" : ""}
        />
        <p className="text-xs text-muted-foreground">
          每行格式: IP地址 ASN编号（用空格分隔）
        </p>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          <Label className="text-destructive">错误信息:</Label>
          <div className="max-h-32 overflow-y-auto p-2 border border-destructive rounded-md">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-destructive">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">
          <strong>示例格式:</strong><br />
          8.8.8.8 AS15169<br />
          1.1.1.1 AS13335<br />
          114.114.114.114 AS4134
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={!bulkData.trim()}>
          导入数据
        </Button>
      </DialogFooter>
    </form>
  );
}
