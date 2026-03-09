"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOUNDATION_TYPES,
  INSULATION_POSITIONS,
  INSULATION_LENGTHS,
} from "@/types";

interface InsulationMaterial {
  id: string;
  name: string;
}

interface FoundationData {
  foundationType: string;
  perimeterLength: number;
  slabArea: number | null;
  slabEdgePosition: string;
  insulationPosition: string;
  insulationLength: string;
  insulationMaterialId: string | null;
}

const defaultFoundation: FoundationData = {
  foundationType: "slab",
  perimeterLength: 0,
  slabArea: null,
  slabEdgePosition: "above_gl",
  insulationPosition: "none",
  insulationLength: "none",
  insulationMaterialId: null,
};

export default function FoundationPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [form, setForm] = useState<FoundationData>(defaultFoundation);
  const [materials, setMaterials] = useState<InsulationMaterial[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, foundRes, matsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}`),
        fetch(`/api/v1/projects/${projectId}/foundation`),
        fetch("/api/v1/admin/insulations"),
      ]);

      if (projRes.ok) {
        const j = await projRes.json();
        if (j.success) setProjectName(j.data.name);
      }
      if (foundRes.ok) {
        const j = await foundRes.json();
        if (j.success && j.data) {
          setForm({
            foundationType: j.data.foundationType ?? "slab",
            perimeterLength: j.data.perimeterLength ?? 0,
            slabArea: j.data.slabArea ?? null,
            slabEdgePosition: j.data.slabEdgePosition ?? "above_gl",
            insulationPosition: j.data.insulationPosition ?? "none",
            insulationLength: j.data.insulationLength ?? "none",
            insulationMaterialId: j.data.insulationMaterialId ?? null,
          });
        }
      }
      if (matsRes.ok) {
        const j = await matsRes.json();
        if (j.success) setMaterials(j.data);
      }
    } catch {
      toast.error("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const update = (field: string, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (form.perimeterLength <= 0) {
      toast.error("外周長は正の値を入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/foundation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("基礎データを保存しました");
      } else {
        toast.error(json.error?.message ?? "保存に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={`/projects/${projectId}/openings`} />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">基礎情報入力</h1>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" data-icon="inline-start" />
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button
            size="sm"
            render={<Link href={`/projects/${projectId}/optimize`} />}
          >
            最適化へ
            <ArrowRight className="h-4 w-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>基礎仕様</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Foundation Type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>基礎タイプ</Label>
                <Select
                  value={form.foundationType}
                  onValueChange={(v) =>
                    update("foundationType", v ?? "slab")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FOUNDATION_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>底盤端部位置</Label>
                <Select
                  value={form.slabEdgePosition}
                  onValueChange={(v) =>
                    update("slabEdgePosition", v ?? "above_gl")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above_gl">GL上</SelectItem>
                    <SelectItem value="below_gl">GL下</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="perimeterLength">
                  基礎外周長 (m) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="perimeterLength"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.perimeterLength || ""}
                  onChange={(e) =>
                    update(
                      "perimeterLength",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="例: 42.0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slabArea">土間床面積 (m²)</Label>
                <Input
                  id="slabArea"
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.slabArea ?? ""}
                  onChange={(e) =>
                    update(
                      "slabArea",
                      e.target.value
                        ? parseFloat(e.target.value)
                        : null
                    )
                  }
                  placeholder="任意"
                />
              </div>
            </div>

            {/* Insulation */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>断熱位置</Label>
                <Select
                  value={form.insulationPosition}
                  onValueChange={(v) =>
                    update("insulationPosition", v ?? "none")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSULATION_POSITIONS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>断熱範囲</Label>
                <Select
                  value={form.insulationLength}
                  onValueChange={(v) =>
                    update("insulationLength", v ?? "none")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSULATION_LENGTHS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Insulation Material */}
            {form.insulationPosition !== "none" && (
              <div className="space-y-1.5">
                <Label>断熱材</Label>
                <Select
                  value={form.insulationMaterialId ?? ""}
                  onValueChange={(v) =>
                    update("insulationMaterialId", v || null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="断熱材を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
