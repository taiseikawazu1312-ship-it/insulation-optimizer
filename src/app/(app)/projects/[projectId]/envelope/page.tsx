"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Loader2,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PART_TYPES,
  ORIENTATIONS,
  ADJACENT_SPACES,
  type PartType,
  type Orientation,
} from "@/types";

interface InsulationMaterial {
  id: string;
  name: string;
  category: string;
}

interface EnvelopePart {
  id?: string;
  partType: string;
  orientation: string | null;
  area: number;
  adjacentSpace: string;
  insulationMaterialId: string | null;
  insulationThickness: number | null;
  additionalInsulationId: string | null;
  additionalThickness: number | null;
}

const emptyPart = (): EnvelopePart => ({
  partType: "wall",
  orientation: null,
  area: 0,
  adjacentSpace: "external_air",
  insulationMaterialId: null,
  insulationThickness: null,
  additionalInsulationId: null,
  additionalThickness: null,
});

export default function EnvelopePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [parts, setParts] = useState<EnvelopePart[]>([]);
  const [materials, setMaterials] = useState<InsulationMaterial[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, partsRes, matsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}`),
        fetch(`/api/v1/projects/${projectId}/envelope`),
        fetch("/api/v1/insulation-materials"),
      ]);

      if (projRes.ok) {
        const projJson = await projRes.json();
        if (projJson.success) setProjectName(projJson.data.name);
      }

      if (partsRes.ok) {
        const partsJson = await partsRes.json();
        if (partsJson.success && partsJson.data.length > 0) {
          setParts(partsJson.data);
        } else {
          setParts([emptyPart()]);
        }
      } else {
        setParts([emptyPart()]);
      }

      if (matsRes.ok) {
        const matsJson = await matsRes.json();
        if (matsJson.success) setMaterials(matsJson.data);
      }
    } catch {
      toast.error("データの読み込みに失敗しました");
      setParts([emptyPart()]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addPart = () => {
    setParts((prev) => [...prev, emptyPart()]);
  };

  const removePart = (index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: string, value: string | number | null) => {
    setParts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async () => {
    const validParts = parts.filter((p) => p.area > 0);
    if (validParts.length === 0) {
      toast.error("面積が0より大きい部位を1つ以上入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/envelope`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: validParts }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("外皮データを保存しました");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/projects" />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">外皮面積入力</h1>
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
            render={<Link href={`/projects/${projectId}/openings`} />}
          >
            開口部へ
            <ArrowRight className="h-4 w-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { label: "外皮", href: `/projects/${projectId}/envelope`, active: true },
          { label: "開口部", href: `/projects/${projectId}/openings`, active: false },
          { label: "基礎", href: `/projects/${projectId}/foundation`, active: false },
          { label: "最適化", href: `/projects/${projectId}/optimize`, active: false },
          { label: "比較", href: `/projects/${projectId}/compare`, active: false },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Parts Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>外皮部位一覧</CardTitle>
          <Button variant="outline" size="sm" onClick={addPart}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            部位を追加
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">部位</TableHead>
                  <TableHead className="w-24">方位</TableHead>
                  <TableHead className="w-24">面積 (m²)</TableHead>
                  <TableHead className="w-36">隣接空間</TableHead>
                  <TableHead className="w-40">断熱材</TableHead>
                  <TableHead className="w-24">厚さ (mm)</TableHead>
                  <TableHead className="w-40">付加断熱</TableHead>
                  <TableHead className="w-24">厚さ (mm)</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={part.partType}
                        onValueChange={(v) =>
                          updatePart(index, "partType", v ?? "wall")
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PART_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={part.orientation ?? ""}
                        onValueChange={(v) =>
                          updatePart(index, "orientation", v || null)
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ORIENTATIONS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={part.area || ""}
                        onChange={(e) =>
                          updatePart(
                            index,
                            "area",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 w-full text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={part.adjacentSpace}
                        onValueChange={(v) =>
                          updatePart(index, "adjacentSpace", v ?? "external_air")
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ADJACENT_SPACES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={part.insulationMaterialId ?? ""}
                        onValueChange={(v) =>
                          updatePart(
                            index,
                            "insulationMaterialId",
                            v || null
                          )
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue placeholder="選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={part.insulationThickness ?? ""}
                        onChange={(e) =>
                          updatePart(
                            index,
                            "insulationThickness",
                            parseFloat(e.target.value) || null
                          )
                        }
                        className="h-7 w-full text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={part.additionalInsulationId ?? ""}
                        onValueChange={(v) =>
                          updatePart(
                            index,
                            "additionalInsulationId",
                            v || null
                          )
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue placeholder="なし" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={part.additionalThickness ?? ""}
                        onChange={(e) =>
                          updatePart(
                            index,
                            "additionalThickness",
                            parseFloat(e.target.value) || null
                          )
                        }
                        className="h-7 w-full text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      {parts.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removePart(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              合計面積:{" "}
              {parts.reduce((sum, p) => sum + (p.area || 0), 0).toFixed(2)} m²
            </span>
            <span>{parts.length} 部位</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
