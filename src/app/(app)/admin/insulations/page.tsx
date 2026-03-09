"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { INSULATION_CATEGORIES, PART_TYPES } from "@/types";

interface InsulationMaterial {
  id: string;
  name: string;
  category: string;
  conductivity: number;
  applicableParts: string[];
  thicknessOptions: number[];
  unitPricePerM2: Record<string, number>;
  density: number | null;
  manufacturer: string | null;
  productCode: string | null;
}

const APPLICABLE_PART_OPTIONS = [
  { value: "wall", label: "壁" },
  { value: "ceiling", label: "天井" },
  { value: "roof", label: "屋根" },
  { value: "floor", label: "床" },
  { value: "foundation", label: "基礎" },
];

const emptyForm = {
  name: "",
  category: "",
  conductivity: "",
  applicableParts: [] as string[],
  thicknessOptions: "",
  unitPricePerM2: "",
  density: "",
  manufacturer: "",
  productCode: "",
};

export default function InsulationsPage() {
  const [materials, setMaterials] = useState<InsulationMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InsulationMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InsulationMaterial | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/insulations");
      const json = await res.json();
      if (json.success) setMaterials(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (mat: InsulationMaterial) => {
    setEditTarget(mat);
    setForm({
      name: mat.name,
      category: mat.category,
      conductivity: String(mat.conductivity),
      applicableParts: mat.applicableParts,
      thicknessOptions: mat.thicknessOptions.join(", "),
      unitPricePerM2: Object.entries(mat.unitPricePerM2)
        .map(([k, v]) => `${k}:${v}`)
        .join(", "),
      density: mat.density ? String(mat.density) : "",
      manufacturer: mat.manufacturer ?? "",
      productCode: mat.productCode ?? "",
    });
    setDialogOpen(true);
  };

  const togglePart = (part: string) => {
    setForm((prev) => ({
      ...prev,
      applicableParts: prev.applicableParts.includes(part)
        ? prev.applicableParts.filter((p) => p !== part)
        : [...prev.applicableParts, part],
    }));
  };

  const parseThicknessOptions = (input: string): number[] => {
    return input
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
  };

  const parseUnitPrices = (input: string): Record<string, number> => {
    const result: Record<string, number> = {};
    input.split(",").forEach((pair) => {
      const [key, val] = pair.split(":").map((s) => s.trim());
      if (key && val) {
        const num = parseFloat(val);
        if (!isNaN(num)) result[key] = num;
      }
    });
    return result;
  };

  const handleSubmit = async () => {
    const conductivity = parseFloat(form.conductivity);
    if (!form.name || !form.category || isNaN(conductivity) || conductivity <= 0) {
      toast.error("名前、カテゴリ、熱伝導率は必須です");
      return;
    }

    const thicknessOptions = parseThicknessOptions(form.thicknessOptions);
    const unitPricePerM2 = parseUnitPrices(form.unitPricePerM2);

    if (thicknessOptions.length === 0) {
      toast.error("厚さオプションを1つ以上入力してください");
      return;
    }

    const payload = {
      name: form.name,
      category: form.category,
      conductivity,
      applicableParts: form.applicableParts,
      thicknessOptions,
      unitPricePerM2,
      density: form.density ? parseFloat(form.density) : null,
      manufacturer: form.manufacturer || null,
      productCode: form.productCode || null,
    };

    setSubmitting(true);
    try {
      const isEdit = editTarget !== null;
      const url = isEdit
        ? `/api/v1/admin/insulations/${editTarget.id}`
        : "/api/v1/admin/insulations";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "断熱材を更新しました" : "断熱材を追加しました");
        setDialogOpen(false);
        fetchMaterials();
      } else {
        toast.error(json.error?.message ?? "保存に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/insulations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("断熱材を削除しました");
        setDeleteTarget(null);
        fetchMaterials();
      } else {
        toast.error(json.error?.message ?? "削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const partLabel = (part: string) =>
    PART_TYPES[part as keyof typeof PART_TYPES] ??
    APPLICABLE_PART_OPTIONS.find((o) => o.value === part)?.label ??
    part;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">断熱材マスタ</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          新規追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            断熱材一覧 ({materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : materials.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                断熱材が登録されていません
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead className="text-right">熱伝導率</TableHead>
                  <TableHead className="hidden md:table-cell">適用部位</TableHead>
                  <TableHead className="hidden lg:table-cell">厚さ</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((mat) => (
                  <TableRow key={mat.id}>
                    <TableCell className="font-medium">{mat.name}</TableCell>
                    <TableCell>
                      {INSULATION_CATEGORIES[
                        mat.category as keyof typeof INSULATION_CATEGORIES
                      ] ?? mat.category}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {mat.conductivity.toFixed(3)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {mat.applicableParts.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {partLabel(p)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {mat.thicknessOptions.join(", ")} mm
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(mat)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(mat)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "断熱材の編集" : "断熱材の追加"}
            </DialogTitle>
            <DialogDescription>
              断熱材の性能値と単価を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="例: 高性能GW 16K"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>カテゴリ *</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, category: val ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INSULATION_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>熱伝導率 (W/mK) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.conductivity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, conductivity: e.target.value }))
                  }
                  placeholder="0.038"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>適用部位</Label>
              <div className="flex flex-wrap gap-3">
                {APPLICABLE_PART_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.applicableParts.includes(opt.value)}
                      onCheckedChange={() => togglePart(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>厚さオプション (mm) *</Label>
              <Input
                value={form.thicknessOptions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, thicknessOptions: e.target.value }))
                }
                placeholder="100, 105, 120, 155, 200"
              />
              <p className="text-xs text-muted-foreground">
                カンマ区切りで入力
              </p>
            </div>
            <div className="grid gap-2">
              <Label>単価 (厚さ:円/m2)</Label>
              <Input
                value={form.unitPricePerM2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitPricePerM2: e.target.value }))
                }
                placeholder="100:1500, 105:1600, 120:1900"
              />
              <p className="text-xs text-muted-foreground">
                厚さ:単価 をカンマ区切りで入力
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>密度 (kg/m3)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.density}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, density: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>メーカー</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, manufacturer: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>品番</Label>
                <Input
                  value={form.productCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productCode: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "保存中..." : editTarget ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>断熱材の削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.name}」を削除してもよろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
