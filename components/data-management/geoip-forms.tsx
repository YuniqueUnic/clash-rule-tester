"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { GeoIPCountryData } from "@/lib/clash-data-sources";

// GeoIP 表单数据接口
export interface GeoIPFormData {
  code: string;
  name: string;
  continent: string;
  popular: boolean;
}

// GeoIP 添加表单
export function GeoIPAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: GeoIPFormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<GeoIPFormData>({
    code: "",
    name: "",
    continent: "",
    popular: false,
  });

  const [errors, setErrors] = useState<Partial<GeoIPFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<GeoIPFormData> = {};

    if (!formData.code.trim()) {
      newErrors.code = "国家代码不能为空";
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = "国家代码只能包含字母、数字、下划线和连字符";
    } else if (formData.code.length < 2 || formData.code.length > 10) {
      newErrors.code = "国家代码长度应在2-10个字符之间";
    }

    if (!formData.name.trim()) {
      newErrors.name = "国家名称不能为空";
    }

    if (!formData.continent.trim()) {
      newErrors.continent = "大洲不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        code: formData.code.toUpperCase(),
      });
    }
  };

  const continents = [
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Africa",
    "Oceania",
    "Antarctica",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country-code">国家代码 *</Label>
        <Input
          id="country-code"
          value={formData.code}
          onChange={(e) =>
            setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="例如: CN, US, JP, CUSTOM"
          maxLength={10}
          className={errors.code ? "border-destructive" : ""}
        />
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code}</p>
        )}
        <p className="text-xs text-muted-foreground">
          支持标准国家代码(如CN、US)或自定义代码(如CUSTOM)，2-10个字符
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country-name">国家名称 *</Label>
        <Input
          id="country-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例如: 中国, 美国, 日本"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="continent">所属大洲 *</Label>
        <Select
          value={formData.continent}
          onValueChange={(value) =>
            setFormData({ ...formData, continent: value })}
        >
          <SelectTrigger
            className={errors.continent ? "border-destructive" : ""}
          >
            <SelectValue placeholder="选择大洲" />
          </SelectTrigger>
          <SelectContent>
            {continents.map((continent) => (
              <SelectItem key={continent} value={continent}>
                {continent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.continent && (
          <p className="text-sm text-destructive">{errors.continent}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="popular"
          checked={formData.popular}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, popular: checked as boolean })}
        />
        <Label htmlFor="popular" className="text-sm font-normal">
          标记为热门国家
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">添加国家</Button>
      </DialogFooter>
    </form>
  );
}

// GeoIP 编辑表单
export function GeoIPEditForm({
  country,
  onSubmit,
  onCancel,
}: {
  country: GeoIPCountryData & { id: string };
  onSubmit: (data: Partial<GeoIPFormData>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<GeoIPFormData>({
    code: country.code,
    name: country.name,
    continent: country.continent,
    popular: country.popular,
  });

  const [errors, setErrors] = useState<Partial<GeoIPFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<GeoIPFormData> = {};

    if (!formData.code.trim()) {
      newErrors.code = "国家代码不能为空";
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = "国家代码只能包含字母、数字、下划线和连字符";
    } else if (formData.code.length < 2 || formData.code.length > 10) {
      newErrors.code = "国家代码长度应在2-10个字符之间";
    }

    if (!formData.name.trim()) {
      newErrors.name = "国家名称不能为空";
    }

    if (!formData.continent.trim()) {
      newErrors.continent = "大洲不能为空";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        code: formData.code.toUpperCase(),
      });
    }
  };

  const continents = [
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Africa",
    "Oceania",
    "Antarctica",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-country-code">国家代码 *</Label>
        <Input
          id="edit-country-code"
          value={formData.code}
          onChange={(e) =>
            setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="例如: CN, US, JP, CUSTOM"
          maxLength={10}
          className={errors.code ? "border-destructive" : ""}
        />
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code}</p>
        )}
        <p className="text-xs text-muted-foreground">
          支持标准国家代码(如CN、US)或自定义代码(如CUSTOM)，2-10个字符
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-country-name">国家名称 *</Label>
        <Input
          id="edit-country-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例如: 中国, 美国, 日本"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-continent">所属大洲 *</Label>
        <Select
          value={formData.continent}
          onValueChange={(value) =>
            setFormData({ ...formData, continent: value })}
        >
          <SelectTrigger
            className={errors.continent ? "border-destructive" : ""}
          >
            <SelectValue placeholder="选择大洲" />
          </SelectTrigger>
          <SelectContent>
            {continents.map((continent) => (
              <SelectItem key={continent} value={continent}>
                {continent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.continent && (
          <p className="text-sm text-destructive">{errors.continent}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="edit-popular"
          checked={formData.popular}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, popular: checked as boolean })}
        />
        <Label htmlFor="edit-popular" className="text-sm font-normal">
          标记为热门国家
        </Label>
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
