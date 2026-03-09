"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORIENTATIONS,
  OPENING_TYPES,
  ATTACHMENTS,
} from "@/types";

interface WindowProduct {
  id: string;
  productLine: string;
  windowType: string;
  frameMaterial: string;
  uwValue: number;
}

interface DoorProduct {
  id: string;
  name: string;
  doorType: string;
  udValue: number;
}

interface Opening {
  id?: string;
  name: string;
  orientation: string;
  width: number;
  height: number;
  openingType: string;
  windowProductId: string | null;
  doorProductId: string | null;
  attachment: string;
  hasSunshade: boolean;
}

const emptyOpening = (): Opening => ({
  name: "",
  orientation: "S",
  width: 0,
  height: 0,
  openingType: "window",
  windowProductId: null,
  doorProductId: null,
  attachment: "none",
  hasSunshade: false,
});

// Omit "top" for openings
const OPENING_ORIENTATIONS = Object.fromEntries(
  Object.entries(ORIENTATIONS).filter(([k]) => k !== "top")
);

export default function OpeningsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [windowProducts, setWindowProducts] = useState<WindowProduct[]>([]);
  const [doorProducts, setDoorProducts] = useState<DoorProduct[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, openingsRes, winsRes, doorsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}`),
        fetch(`/api/v1/projects/${projectId}/openings`),
        fetch("/api/v1/admin/windows"),
        fetch("/api/v1/admin/doors"),
      ]);

      if (projRes.ok) {
        const j = await projRes.json();
        if (j.success) setProjectName(j.data.name);
      }
      if (openingsRes.ok) {
        const j = await openingsRes.json();
        if (j.success && j.data.length > 0) setOpenings(j.data);
        else setOpenings([emptyOpening()]);
      } else {
        setOpenings([emptyOpening()]);
      }
      if (winsRes.ok) {
        const j = await winsRes.json();
        if (j.success) setWindowProducts(j.data);
      }
      if (doorsRes.ok) {
        const j = await doorsRes.json();
        if (j.success) setDoorProducts(j.data);
      }
    } catch {
      toast.error("データの読み込みに失敗しました");
      setOpenings([emptyOpening()]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addOpening = () => setOpenings((prev) => [...prev, emptyOpening()]);
  const removeOpening = (i: number) =>
    setOpenings((prev) => prev.filter((_, idx) => idx !== i));

  const updateOpening = (
    i: number,
    field: string,
    value: string | number | boolean | null
  ) => {
    setOpenings((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o))
    );
  };

  const handleSave = async () => {
    const valid = openings.filter((o) => o.width > 0 && o.height > 0);
    if (valid.length === 0) {
      toast.error("幅と高さが0より大きい開口部を1つ以上入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/openings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openings: valid }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("開口部データを保存しました");
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
            render={<Link href={`/projects/${projectId}/envelope`} />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">開口部入力</h1>
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
            render={<Link href={`/projects/${projectId}/foundation`} />}
          >
            基礎へ
            <ArrowRight className="h-4 w-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {/* Openings Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>開口部一覧</CardTitle>
          <Button variant="outline" size="sm" onClick={addOpening}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            開口部を追加
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">名称</TableHead>
                  <TableHead className="w-20">方位</TableHead>
                  <TableHead className="w-20">幅(mm)</TableHead>
                  <TableHead className="w-20">高さ(mm)</TableHead>
                  <TableHead className="w-20">種別</TableHead>
                  <TableHead className="w-44">製品</TableHead>
                  <TableHead className="w-24">付属部材</TableHead>
                  <TableHead className="w-16">日除け</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {openings.map((opening, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={opening.name}
                        onChange={(e) =>
                          updateOpening(index, "name", e.target.value)
                        }
                        placeholder="窓1"
                        className="h-7 w-full text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={opening.orientation}
                        onValueChange={(v) =>
                          updateOpening(index, "orientation", v ?? "S")
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OPENING_ORIENTATIONS).map(
                            ([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={opening.width || ""}
                        onChange={(e) =>
                          updateOpening(
                            index,
                            "width",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 w-full text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={opening.height || ""}
                        onChange={(e) =>
                          updateOpening(
                            index,
                            "height",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 w-full text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={opening.openingType}
                        onValueChange={(v) =>
                          updateOpening(index, "openingType", v ?? "window")
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OPENING_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {opening.openingType === "window" ? (
                        <Select
                          value={opening.windowProductId ?? ""}
                          onValueChange={(v) =>
                            updateOpening(
                              index,
                              "windowProductId",
                              v || null
                            )
                          }
                        >
                          <SelectTrigger size="sm" className="w-full">
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {windowProducts.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.productLine} {w.windowType} (U=
                                {w.uwValue})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={opening.doorProductId ?? ""}
                          onValueChange={(v) =>
                            updateOpening(
                              index,
                              "doorProductId",
                              v || null
                            )
                          }
                        >
                          <SelectTrigger size="sm" className="w-full">
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {doorProducts.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} (U={d.udValue})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={opening.attachment}
                        onValueChange={(v) =>
                          updateOpening(index, "attachment", v ?? "none")
                        }
                      >
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ATTACHMENTS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={opening.hasSunshade}
                        onCheckedChange={(checked) =>
                          updateOpening(index, "hasSunshade", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {openings.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeOpening(index)}
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

          <div className="mt-4 text-sm text-muted-foreground">
            {openings.length} 開口部
          </div>
        </CardContent>
      </Card>
    </>
  );
}
