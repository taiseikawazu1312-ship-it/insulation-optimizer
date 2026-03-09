"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  AppWindow,
  Upload,
  Loader2,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FRAME_MATERIALS, SOLAR_TYPES, WINDOW_TYPES } from "@/types";

interface WindowProduct {
  id: string;
  productLine: string;
  windowType: string;
  frameMaterial: string;
  glassType: string;
  glassLayers: number;
  spacerType: string | null;
  gasFill: boolean;
  solarType: string;
  sizeCode: string | null;
  width: number;
  height: number;
  sashWidth: number | null;
  uwValue: number;
  ugValue: number | null;
  etaG: number | null;
  listPrice: number | null;
  estimatedCost: number | null;
  fireRated: boolean;
  manufacturer: string;
}

const emptyForm = {
  productLine: "",
  windowType: "",
  frameMaterial: "",
  glassType: "",
  glassLayers: "2",
  spacerType: "",
  gasFill: false,
  solarType: "acquisition",
  sizeCode: "",
  width: "",
  height: "",
  sashWidth: "",
  uwValue: "",
  ugValue: "",
  etaG: "",
  listPrice: "",
  estimatedCost: "",
  fireRated: false,
  manufacturer: "YKK AP",
};

export default function WindowsPage() {
  const [windows, setWindows] = useState<WindowProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WindowProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WindowProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [importJson, setImportJson] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWindows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/windows");
      const json = await res.json();
      if (json.success) setWindows(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (win: WindowProduct) => {
    setEditTarget(win);
    setForm({
      productLine: win.productLine,
      windowType: win.windowType,
      frameMaterial: win.frameMaterial,
      glassType: win.glassType,
      glassLayers: String(win.glassLayers),
      spacerType: win.spacerType ?? "",
      gasFill: win.gasFill,
      solarType: win.solarType,
      sizeCode: win.sizeCode ?? "",
      width: String(win.width),
      height: String(win.height),
      sashWidth: win.sashWidth ? String(win.sashWidth) : "",
      uwValue: String(win.uwValue),
      ugValue: win.ugValue ? String(win.ugValue) : "",
      etaG: win.etaG ? String(win.etaG) : "",
      listPrice: win.listPrice ? String(win.listPrice) : "",
      estimatedCost: win.estimatedCost ? String(win.estimatedCost) : "",
      fireRated: win.fireRated,
      manufacturer: win.manufacturer,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const uwValue = parseFloat(form.uwValue);
    const width = parseFloat(form.width);
    const height = parseFloat(form.height);
    const glassLayers = parseInt(form.glassLayers);

    if (!form.productLine || !form.windowType || !form.frameMaterial || !form.glassType) {
      toast.error("必須項目を入力してください");
      return;
    }
    if (isNaN(uwValue) || uwValue <= 0 || isNaN(width) || isNaN(height)) {
      toast.error("Uw値、幅、高さは正の数で入力してください");
      return;
    }

    const payload: Record<string, unknown> = {
      productLine: form.productLine,
      windowType: form.windowType,
      frameMaterial: form.frameMaterial,
      glassType: form.glassType,
      glassLayers,
      spacerType: form.spacerType || null,
      gasFill: form.gasFill,
      solarType: form.solarType,
      sizeCode: form.sizeCode || null,
      width,
      height,
      sashWidth: form.sashWidth ? parseFloat(form.sashWidth) : null,
      uwValue,
      ugValue: form.ugValue ? parseFloat(form.ugValue) : null,
      etaG: form.etaG ? parseFloat(form.etaG) : null,
      listPrice: form.listPrice ? parseInt(form.listPrice) : null,
      estimatedCost: form.estimatedCost ? parseInt(form.estimatedCost) : null,
      fireRated: form.fireRated,
      manufacturer: form.manufacturer,
    };

    setSubmitting(true);
    try {
      const isEdit = editTarget !== null;
      const url = isEdit
        ? `/api/v1/admin/windows/${editTarget.id}`
        : "/api/v1/admin/windows";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "窓製品を更新しました" : "窓製品を追加しました");
        setDialogOpen(false);
        fetchWindows();
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
      const res = await fetch(`/api/v1/admin/windows/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("窓製品を削除しました");
        setDeleteTarget(null);
        fetchWindows();
      } else {
        toast.error(json.error?.message ?? "削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      toast.error("JSONの形式が不正です");
      return;
    }

    const payload = Array.isArray(parsed) ? { windows: parsed } : parsed;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/windows/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${json.data.imported}件の窓製品をインポートしました`);
        setImportDialogOpen(false);
        setImportJson("");
        fetchWindows();
      } else {
        toast.error(json.error?.message ?? "インポートに失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const windowTypeLabel = (type: string) =>
    WINDOW_TYPES[type as keyof typeof WINDOW_TYPES] ?? type;

  const frameMaterialLabel = (mat: string) =>
    FRAME_MATERIALS[mat as keyof typeof FRAME_MATERIALS] ?? mat;

  const formatPrice = (price: number | null) =>
    price != null ? `${price.toLocaleString()}` : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">窓マスタ</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4" data-icon="inline-start" />
            JSONインポート
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            新規追加
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AppWindow className="h-4 w-4" />
            窓製品一覧 ({windows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : windows.length === 0 ? (
            <div className="py-12 text-center">
              <AppWindow className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                窓製品が登録されていません
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>製品ライン</TableHead>
                  <TableHead>窓タイプ</TableHead>
                  <TableHead className="hidden md:table-cell">フレーム</TableHead>
                  <TableHead className="hidden lg:table-cell">日射</TableHead>
                  <TableHead className="text-right">Uw</TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    定価
                  </TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {windows.map((win) => (
                  <TableRow key={win.id}>
                    <TableCell className="font-medium">
                      {win.productLine}
                    </TableCell>
                    <TableCell>{windowTypeLabel(win.windowType)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {frameMaterialLabel(win.frameMaterial)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="secondary"
                        className={
                          win.solarType === "shielding"
                            ? "bg-blue-100 text-blue-700"
                            : ""
                        }
                      >
                        {SOLAR_TYPES[win.solarType as keyof typeof SOLAR_TYPES] ??
                          win.solarType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {win.uwValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      {formatPrice(win.listPrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(win)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(win)}
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "窓製品の編集" : "窓製品の追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>製品ライン *</Label>
                <Input
                  value={form.productLine}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productLine: e.target.value }))
                  }
                  placeholder="APW 330"
                />
              </div>
              <div className="grid gap-2">
                <Label>窓タイプ *</Label>
                <Select
                  value={form.windowType}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, windowType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WINDOW_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>フレーム材質 *</Label>
                <Select
                  value={form.frameMaterial}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, frameMaterial: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FRAME_MATERIALS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>ガラスタイプ *</Label>
                <Input
                  value={form.glassType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, glassType: e.target.value }))
                  }
                  placeholder="double_low_e"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>ガラス層数</Label>
                <Input
                  type="number"
                  min="1"
                  max="4"
                  value={form.glassLayers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, glassLayers: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>スペーサー</Label>
                <Input
                  value={form.spacerType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, spacerType: e.target.value }))
                  }
                  placeholder="resin"
                />
              </div>
              <div className="grid gap-2">
                <Label>日射タイプ</Label>
                <Select
                  value={form.solarType}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, solarType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOLAR_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>幅 (mm) *</Label>
                <Input
                  type="number"
                  value={form.width}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, width: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>高さ (mm) *</Label>
                <Input
                  type="number"
                  value={form.height}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, height: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>サイズコード</Label>
                <Input
                  value={form.sizeCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sizeCode: e.target.value }))
                  }
                  placeholder="16509"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Uw値 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.uwValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, uwValue: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Ug値</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.ugValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ugValue: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>eta-g</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.etaG}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, etaG: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>定価 (円)</Label>
                <Input
                  type="number"
                  value={form.listPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, listPrice: e.target.value }))
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
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.gasFill}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, gasFill: !!checked }))
                  }
                />
                ガス入り
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.fireRated}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, fireRated: !!checked }))
                  }
                />
                防火対応
              </label>
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

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open) setImportDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>窓製品JSONインポート</DialogTitle>
            <DialogDescription>
              JSONファイルまたはテキストで窓製品データを一括インポートします
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>JSONファイル</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
              />
            </div>
            <div className="grid gap-2">
              <Label>またはJSONテキストを入力</Label>
              <Textarea
                rows={10}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={`{"windows": [{"productLine": "APW 330", ...}]}`}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportJson("");
              }}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleImport}
              disabled={submitting || !importJson.trim()}
            >
              {submitting ? "インポート中..." : "インポート"}
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
            <DialogTitle>窓製品の削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.productLine} ({deleteTarget?.windowType})
              」を削除してもよろしいですか？
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
