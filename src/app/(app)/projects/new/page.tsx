"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGIONS, TARGET_GRADES, STRUCTURE_TYPES } from "@/types";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    region: "6",
    targetGrade: "ZEH",
    structureType: "timber_frame",
    totalFloorArea: "",
    stories: "2",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "プロジェクト名は必須です";
    if (!form.region) errs.region = "地域を選択してください";
    if (!form.targetGrade) errs.targetGrade = "目標等級を選択してください";
    if (!form.structureType)
      errs.structureType = "構造種別を選択してください";
    const area = parseFloat(form.totalFloorArea);
    if (!form.totalFloorArea || isNaN(area) || area <= 0)
      errs.totalFloorArea = "延床面積は正の値を入力してください";
    const stories = parseInt(form.stories);
    if (isNaN(stories) || stories < 1 || stories > 4)
      errs.stories = "階数は1~4の整数を入力してください";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        region: parseInt(form.region),
        targetGrade: form.targetGrade,
        structureType: form.structureType,
        totalFloorArea: parseFloat(form.totalFloorArea),
        stories: parseInt(form.stories),
        notes: form.notes.trim() || null,
      };

      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("プロジェクトを作成しました");
        router.push(`/projects/${json.data.id}/envelope`);
      } else {
        toast.error(json.error?.message ?? "作成に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = (field: string) =>
    errors[field] ? "border-destructive" : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/projects" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">新規プロジェクト</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>
            断熱仕様を最適化するプロジェクトの基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                プロジェクト名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例: ○○邸 新築工事"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={fieldClass("name")}
                maxLength={200}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Region + Target Grade */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  地域区分 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.region}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, region: val ?? "" }))
                  }
                >
                  <SelectTrigger
                    className={`w-full ${fieldClass("region")}`}
                  >
                    <SelectValue placeholder="地域を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REGIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.region && (
                  <p className="text-xs text-destructive">{errors.region}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  目標等級 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.targetGrade}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, targetGrade: val ?? "" }))
                  }
                >
                  <SelectTrigger
                    className={`w-full ${fieldClass("targetGrade")}`}
                  >
                    <SelectValue placeholder="等級を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TARGET_GRADES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.targetGrade && (
                  <p className="text-xs text-destructive">
                    {errors.targetGrade}
                  </p>
                )}
              </div>
            </div>

            {/* Structure Type */}
            <div className="space-y-1.5">
              <Label>
                構造種別 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.structureType}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, structureType: val ?? "" }))
                }
              >
                <SelectTrigger
                  className={`w-full ${fieldClass("structureType")}`}
                >
                  <SelectValue placeholder="構造種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STRUCTURE_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.structureType && (
                <p className="text-xs text-destructive">
                  {errors.structureType}
                </p>
              )}
            </div>

            {/* Floor Area + Stories */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="totalFloorArea">
                  延床面積 (m²) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="totalFloorArea"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="例: 120.5"
                  value={form.totalFloorArea}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      totalFloorArea: e.target.value,
                    }))
                  }
                  className={fieldClass("totalFloorArea")}
                />
                {errors.totalFloorArea && (
                  <p className="text-xs text-destructive">
                    {errors.totalFloorArea}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>階数</Label>
                <Select
                  value={form.stories}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, stories: val ?? "2" }))
                  }
                >
                  <SelectTrigger
                    className={`w-full ${fieldClass("stories")}`}
                  >
                    <SelectValue placeholder="階数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1階</SelectItem>
                    <SelectItem value="2">2階</SelectItem>
                    <SelectItem value="3">3階</SelectItem>
                    <SelectItem value="4">4階</SelectItem>
                  </SelectContent>
                </Select>
                {errors.stories && (
                  <p className="text-xs text-destructive">
                    {errors.stories}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">メモ</Label>
              <Textarea
                id="notes"
                placeholder="備考・メモ（任意）"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                maxLength={2000}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "作成中..." : "プロジェクトを作成"}
              </Button>
              <Button
                type="button"
                variant="outline"
                render={<Link href="/projects" />}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
