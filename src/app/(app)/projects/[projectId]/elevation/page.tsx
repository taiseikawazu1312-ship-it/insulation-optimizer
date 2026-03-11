"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DIRECTIONS } from "@/types";

type Direction = keyof typeof DIRECTIONS;

interface WindowItem {
  name: string;
  windowType: string;
  width: number;
  height: number;
  area: number;
}

type WindowsState = Record<Direction, WindowItem[]>;

const DEMO_DATA = {
  widthN: 12740,
  widthE: 11375,
  widthS: 12740,
  widthW: 11375,
  maxHeight: 4200,
  eaveHeight: 2850,
  firstFloorToEave: 2810,
  windowsN: [
    { name: "トイレ北側", windowType: "縦スベリ出し窓", width: 260, height: 700, area: 0.182 },
    { name: "子ども室", windowType: "引違い窓", width: 1600, height: 900, area: 1.44 },
  ],
  windowsE: [
    { name: "タタミコーナー", windowType: "引違い窓", width: 1600, height: 900, area: 1.44 },
    { name: "ポーチ横", windowType: "縦スベリ出し窓", width: 260, height: 700, area: 0.182 },
  ],
  windowsS: [
    { name: "寝室", windowType: "引違い窓", width: 1600, height: 900, area: 1.44 },
    { name: "クローゼット南側", windowType: "縦スベリ出し窓", width: 260, height: 700, area: 0.182 },
    { name: "LDK中央", windowType: "引違い窓", width: 2560, height: 2000, area: 5.12 },
    { name: "LDK東側", windowType: "引違い窓", width: 2560, height: 2000, area: 5.12 },
  ],
  windowsW: [
    { name: "ランドリー", windowType: "FIX窓", width: 1195, height: 300, area: 0.3585 },
  ],
};

const DIR_KEYS: Direction[] = ["N", "E", "S", "W"];

export default function ElevationPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [widths, setWidths] = useState<Record<Direction, number | null>>({ N: null, E: null, S: null, W: null });
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [eaveHeight, setEaveHeight] = useState<number | null>(null);
  const [firstFloorToEave, setFirstFloorToEave] = useState<number | null>(null);
  const [windows, setWindows] = useState<WindowsState>({ N: [], E: [], S: [], W: [] });
  const [activeTab, setActiveTab] = useState<Direction>("N");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}/elevation`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setWidths({ N: d.widthN, E: d.widthE, S: d.widthS, W: d.widthW });
          setMaxHeight(d.maxHeight);
          setEaveHeight(d.eaveHeight);
          setFirstFloorToEave(d.firstFloorToEave);
          setWindows({
            N: d.windowsN || [],
            E: d.windowsE || [],
            S: d.windowsS || [],
            W: d.windowsW || [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const loadDemoData = useCallback(() => {
    setWidths({ N: DEMO_DATA.widthN, E: DEMO_DATA.widthE, S: DEMO_DATA.widthS, W: DEMO_DATA.widthW });
    setMaxHeight(DEMO_DATA.maxHeight);
    setEaveHeight(DEMO_DATA.eaveHeight);
    setFirstFloorToEave(DEMO_DATA.firstFloorToEave);
    setWindows({
      N: DEMO_DATA.windowsN,
      E: DEMO_DATA.windowsE,
      S: DEMO_DATA.windowsS,
      W: DEMO_DATA.windowsW,
    });
  }, []);

  const windowTotals = useMemo(() => {
    const totals: Record<Direction, number> = { N: 0, E: 0, S: 0, W: 0 };
    for (const dir of DIR_KEYS) {
      totals[dir] = windows[dir].reduce((sum, w) => sum + (w.area || 0), 0);
    }
    return totals;
  }, [windows]);

  const results = useMemo(() => {
    return DIR_KEYS.map((dir) => {
      const w = widths[dir];
      const h = eaveHeight;
      if (!w || !h) return { dir, widthM: 0, heightM: 0, gross: 0, windowArea: 0, net: 0 };
      const widthM = w / 1000;
      const heightM = h / 1000;
      const gross = widthM * heightM;
      const windowArea = windowTotals[dir];
      const net = Math.max(0, gross - windowArea);
      return { dir, widthM, heightM, gross, windowArea, net };
    });
  }, [widths, eaveHeight, windowTotals]);

  const totalWallArea = useMemo(() => results.reduce((s, r) => s + r.net, 0), [results]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/elevation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widthN: widths.N, widthE: widths.E, widthS: widths.S, widthW: widths.W,
          maxHeight, eaveHeight, firstFloorToEave,
          windowsN: windows.N, windowsE: windows.E, windowsS: windows.S, windowsW: windows.W,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    setTransferring(true);
    try {
      await handleSave();
      const res = await fetch(`/api/v1/projects/${projectId}/elevation/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        router.push(`/projects/${projectId}/envelope`);
      }
    } finally {
      setTransferring(false);
    }
  };

  const updateWindow = (dir: Direction, idx: number, field: keyof WindowItem, value: string | number) => {
    setWindows((prev) => {
      const list = [...prev[dir]];
      const item = { ...list[idx], [field]: value };
      if (field === "width" || field === "height") {
        item.area = Math.round(((item.width * item.height) / 1_000_000) * 10000) / 10000;
      }
      list[idx] = item;
      return { ...prev, [dir]: list };
    });
  };

  const addWindow = (dir: Direction) => {
    setWindows((prev) => ({
      ...prev,
      [dir]: [...prev[dir], { name: "", windowType: "引違い窓", width: 0, height: 0, area: 0 }],
    }));
  };

  const removeWindow = (dir: Direction, idx: number) => {
    setWindows((prev) => ({
      ...prev,
      [dir]: prev[dir].filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            戻る
          </Button>
          <h1 className="text-xl font-semibold">立面図面積算出</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDemoData}>
            <Download className="mr-1 h-4 w-4" />
            デモデータ
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            保存
          </Button>
          <Button size="sm" onClick={() => router.push(`/projects/${projectId}/envelope`)}>
            次へ
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Step 1: 平面図から横幅取得 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 平面図から各方角の横幅</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg border">
              <Image
                src="/sample-drawings/floor-plan.png"
                alt="サンプル平面図"
                width={600}
                height={450}
                className="h-auto w-full object-contain"
              />
              <p className="bg-muted/50 p-2 text-center text-xs text-muted-foreground">
                サンプル: 辻林邸 平面図
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                平面図から各方角の外壁横幅（mm）を入力してください。
              </p>
              {DIR_KEYS.map((dir) => (
                <div key={dir} className="flex items-center gap-3">
                  <Badge variant="outline" className="w-16 justify-center">
                    {DIRECTIONS[dir]}面
                  </Badge>
                  <Input
                    type="number"
                    step={1}
                    min={0}
                    value={widths[dir] ?? ""}
                    onChange={(e) =>
                      setWidths((prev) => ({ ...prev, [dir]: e.target.value ? Number(e.target.value) : null }))
                    }
                    className="w-36"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">mm</span>
                  {widths[dir] && (
                    <span className="text-sm text-muted-foreground">
                      = {(widths[dir]! / 1000).toFixed(3)} m
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: 窓情報テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 窓情報（面ごと）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-1">
            {DIR_KEYS.map((dir) => (
              <Button
                key={dir}
                variant={activeTab === dir ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(dir)}
              >
                {DIRECTIONS[dir]}面
                {windows[dir].length > 0 && (
                  <Badge variant="secondary" className="ml-1.5">
                    {windows[dir].length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">名称</TableHead>
                  <TableHead className="w-40">窓種</TableHead>
                  <TableHead className="w-28">幅 (mm)</TableHead>
                  <TableHead className="w-28">高さ (mm)</TableHead>
                  <TableHead className="w-28">面積 (m²)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {windows[activeTab].length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      窓データなし
                    </TableCell>
                  </TableRow>
                ) : (
                  windows[activeTab].map((w, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={w.name}
                          onChange={(e) => updateWindow(activeTab, idx, "name", e.target.value)}
                          className="h-8"
                          placeholder="窓名称"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={w.windowType}
                          onChange={(e) => updateWindow(activeTab, idx, "windowType", e.target.value)}
                          className="h-8"
                          placeholder="窓種"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={w.width || ""}
                          onChange={(e) => updateWindow(activeTab, idx, "width", Number(e.target.value))}
                          className="h-8"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={w.height || ""}
                          onChange={(e) => updateWindow(activeTab, idx, "height", Number(e.target.value))}
                          className="h-8"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{w.area.toFixed(4)}</span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeWindow(activeTab, idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={4}>
                    <Button variant="outline" size="sm" onClick={() => addWindow(activeTab)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      行追加
                    </Button>
                  </TableCell>
                  <TableCell colSpan={2} className="text-right">
                    <span className="text-sm font-semibold">
                      合計: {windowTotals[activeTab].toFixed(4)} m²
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: 立面図から寸法取得 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">③ 立面図からの寸法取得</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg border">
              <Image
                src="/sample-drawings/elevation-bw.png"
                alt="サンプル立面図"
                width={600}
                height={350}
                className="h-auto w-full object-contain"
              />
              <p className="bg-muted/50 p-2 text-center text-xs text-muted-foreground">
                サンプル: 辻林邸 立面図
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                立面図から高さ寸法（mm）を読み取って入力してください。
              </p>
              <div className="flex items-center gap-3">
                <span className="w-36 text-sm">最高の高さ</span>
                <Input
                  type="number"
                  value={maxHeight ?? ""}
                  onChange={(e) => setMaxHeight(e.target.value ? Number(e.target.value) : null)}
                  className="w-36"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">mm</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-36 text-sm font-semibold">
                  軒高さ <Badge variant="default" className="ml-1">計算用</Badge>
                </span>
                <Input
                  type="number"
                  value={eaveHeight ?? ""}
                  onChange={(e) => setEaveHeight(e.target.value ? Number(e.target.value) : null)}
                  className="w-36"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">mm</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-36 text-sm">1FL - 軒高さ</span>
                <Input
                  type="number"
                  value={firstFloorToEave ?? ""}
                  onChange={(e) => setFirstFloorToEave(e.target.value ? Number(e.target.value) : null)}
                  className="w-36"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">mm</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: 立面図セグメンテーション */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">④ 立面図セグメンテーション</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Image
              src="/sample-drawings/elevation-color.png"
              alt="立面図セグメンテーション"
              width={1200}
              height={600}
              className="h-auto w-full object-contain"
            />
            <p className="bg-muted/50 p-2 text-center text-xs text-muted-foreground">
              サンプル: 辻林邸 立面図（南側・東側・北側・西側）- 壁面領域をカラー表示
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 5: 面積算出結果 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">⑤ 面積算出結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">面</TableHead>
                  <TableHead className="w-28 text-right">横幅 (m)</TableHead>
                  <TableHead className="w-28 text-right">高さ (m)</TableHead>
                  <TableHead className="w-28 text-right">全体面積 (m²)</TableHead>
                  <TableHead className="w-28 text-right">窓面積 (m²)</TableHead>
                  <TableHead className="w-28 text-right font-semibold">壁面積 (m²)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.dir}>
                    <TableCell>
                      <Badge variant="outline">{DIRECTIONS[r.dir as Direction]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.widthM ? r.widthM.toFixed(3) : "-"}</TableCell>
                    <TableCell className="text-right">{r.heightM ? r.heightM.toFixed(3) : "-"}</TableCell>
                    <TableCell className="text-right">{r.gross ? r.gross.toFixed(3) : "-"}</TableCell>
                    <TableCell className="text-right">{r.windowArea.toFixed(4)}</TableCell>
                    <TableCell className="text-right font-semibold">{r.net ? r.net.toFixed(3) : "-"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={5} className="text-right font-semibold">
                    壁面積合計
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold">
                    {totalWallArea.toFixed(3)} m²
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-center">
            <Button onClick={handleTransfer} disabled={transferring || totalWallArea === 0} size="lg">
              {transferring ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              外皮データに反映
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
