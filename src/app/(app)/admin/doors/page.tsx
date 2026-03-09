"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DoorOpen, Loader2 } from "lucide-react";
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
import { DOOR_TYPES } from "@/types";

interface DoorProduct {
  id: string;
  name: string;
  doorType: string;
  material: string | null;
  hasGlass: boolean;
  glassType: string | null;
  udValue: number;
  listPrice: number | null;
  manufacturer: string | null;
}

const emptyForm = {
  name: "",
  doorType: "",
  material: "",
  hasGlass: false,
  glassType: "",
  udValue: "",
  listPrice: "",
  manufacturer: "",
};

export default function DoorsPage() {
  const [doors, setDoors] = useState<DoorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DoorProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoorProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchDoors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/doors");
      const json = await res.json();
      if (json.success) setDoors(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoors();
  }, [fetchDoors]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (door: DoorProduct) => {
    setEditTarget(door);
    setForm({
      name: door.name,
      doorType: door.doorType,
      material: door.material ?? "",
      hasGlass: door.hasGlass,
      glassType: door.glassType ?? "",
      udValue: String(door.udValue),
      listPrice: door.listPrice ? String(door.listPrice) : "",
      manufacturer: door.manufacturer ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const udValue = parseFloat(form.udValue);
    if (!form.name || !form.doorType || isNaN(udValue) || udValue <= 0) {
      toast.error("名称、ドアタイプ、Ud値は必須です");
      return;
    }

    const payload = {
      name: form.name,
      doorType: form.doorType,
      material: form.material || null,
      hasGlass: form.hasGlass,
      glassType: form.hasGlass && form.glassType ? form.glassType : null,
      udValue,
      listPrice: form.listPrice ? parseInt(form.listPrice) : null,
      manufacturer: form.manufacturer || null,
    };

    setSubmitting(true);
    try {
      const isEdit = editTarget !== null;
      // Doors API doesn't have individual PATCH/DELETE routes yet,
      // so for create we POST, for edit we'd need the route
      const url = isEdit
        ? `/api/v1/admin/doors/${editTarget.id}`
        : "/api/v1/admin/doors";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "ドアを更新しました" : "ドアを追加しました");
        setDialogOpen(false);
        fetchDoors();
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
      const res = await fetch(`/api/v1/admin/doors/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("ドアを削除しました");
        setDeleteTarget(null);
        fetchDoors();
      } else {
        toast.error(json.error?.message ?? "削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number | null) =>
    price != null ? `${price.toLocaleString()}` : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ドアマスタ</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          新規追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            ドア製品一覧 ({doors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : doors.length === 0 ? (
            <div className="py-12 text-center">
              <DoorOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                ドア製品が登録されていません
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead className="hidden md:table-cell">ガラス</TableHead>
                  <TableHead className="text-right">Ud値</TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    定価
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">メーカー</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doors.map((door) => (
                  <TableRow key={door.id}>
                    <TableCell className="font-medium">{door.name}</TableCell>
                    <TableCell>
                      {DOOR_TYPES[door.doorType as keyof typeof DOOR_TYPES] ??
                        door.doorType}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {door.hasGlass ? (
                        <Badge variant="secondary" className="text-xs">
                          {door.glassType ?? "あり"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">なし</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {door.udValue.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      {formatPrice(door.listPrice)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {door.manufacturer ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(door)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(door)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "ドアの編集" : "ドアの追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="高断熱玄関ドア"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>ドアタイプ *</Label>
                <Select
                  value={form.doorType}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, doorType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOOR_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Ud値 (W/m2K) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.udValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, udValue: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>材質</Label>
                <Input
                  value={form.material}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, material: e.target.value }))
                  }
                  placeholder="aluminum_resin"
                />
              </div>
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
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.hasGlass}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, hasGlass: !!checked }))
                }
              />
              <Label>ガラス付き</Label>
            </div>
            {form.hasGlass && (
              <div className="grid gap-2">
                <Label>ガラスタイプ</Label>
                <Input
                  value={form.glassType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, glassType: e.target.value }))
                  }
                  placeholder="double_low_e"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>メーカー</Label>
              <Input
                value={form.manufacturer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, manufacturer: e.target.value }))
                }
                placeholder="YKK AP"
              />
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
            <DialogTitle>ドアの削除</DialogTitle>
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
