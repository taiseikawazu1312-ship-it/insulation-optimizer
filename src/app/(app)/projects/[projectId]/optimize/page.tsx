"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TARGET_GRADES, type TargetGrade } from "@/types";

interface OptimizationResult {
  id: string;
  targetGrade: string;
  achievedUA: number;
  achievedEtaAC: number | null;
  achievedEtaAH: number | null;
  totalCost: number;
  specsJson: string;
  calculationJson: string;
  isSelected: boolean;
  createdAt: string;
}

interface PartSpec {
  partType: string;
  orientation?: string;
  area: number;
  materialName: string;
  thickness: number;
  uValue: number;
  cost: number;
}

interface OpeningSpec {
  orientation: string;
  area: number;
  openingType: string;
  productName: string;
  uValue: number;
  cost: number;
}

interface FoundationSpec {
  perimeterLength: number;
  psiValue: number;
  cost: number;
}

interface ParsedSpecs {
  parts: PartSpec[];
  openings: OpeningSpec[];
  foundation: FoundationSpec;
}

const PART_TYPE_LABELS: Record<string, string> = {
  ceiling: "天井",
  roof: "屋根",
  wall: "壁",
  floor: "床",
  foundation_wall: "基礎壁",
  slab: "土間床",
};

const ORIENTATION_LABELS: Record<string, string> = {
  N: "北", NE: "北東", E: "東", SE: "南東",
  S: "南", SW: "南西", W: "西", NW: "北西", top: "上面",
};

export default function OptimizePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [projectName, setProjectName] = useState("");
  const [projectGrade, setProjectGrade] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [specs, setSpecs] = useState<ParsedSpecs | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, resultsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}`),
        fetch(`/api/v1/projects/${projectId}/results`),
      ]);

      if (projRes.ok) {
        const j = await projRes.json();
        if (j.success) {
          setProjectName(j.data.name);
          setProjectGrade(j.data.targetGrade);
        }
      }

      if (resultsRes.ok) {
        const j = await resultsRes.json();
        if (j.success && j.data.length > 0) {
          const latest = j.data[0];
          setResult(latest);
          try {
            const parsed = typeof latest.specsJson === "string"
              ? JSON.parse(latest.specsJson)
              : latest.specs ?? null;
            setSpecs(parsed);
          } catch {
            setSpecs(null);
          }
        }
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

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/optimize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("最適化が完了しました");
        const data = json.data;
        setResult({
          id: data.resultId,
          targetGrade: projectGrade,
          achievedUA: data.achievedUA,
          achievedEtaAC: data.achievedEtaAC ?? null,
          achievedEtaAH: data.achievedEtaAH ?? null,
          totalCost: data.totalCost,
          specsJson: JSON.stringify(data.specs),
          calculationJson: "{}",
          isSelected: false,
          createdAt: new Date().toISOString(),
        });
        setSpecs(data.specs ?? null);
      } else {
        toast.error(json.error?.message ?? "最適化に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setOptimizing(false);
    }
  };

  const formatCost = (cost: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(cost);

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
            render={<Link href={`/projects/${projectId}/foundation`} />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">最適化実行</h1>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runOptimization}
            disabled={optimizing}
          >
            {optimizing ? (
              <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Play className="h-4 w-4" data-icon="inline-start" />
            )}
            {optimizing ? "最適化中..." : "最適化実行"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/projects/${projectId}/compare`} />}
          >
            比較へ
            <ArrowRight className="h-4 w-4" data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Play className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              外皮・開口部・基礎データを入力後、最適化を実行してください
            </p>
            <Button className="mt-4" onClick={runOptimization} disabled={optimizing}>
              {optimizing ? "最適化中..." : "最適化を実行"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                最適化結果
                {result.achievedUA > 0 ? (
                  <Badge className="bg-green-100 text-green-700" variant="secondary">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    達成
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700" variant="secondary">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    未達成
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                目標: {TARGET_GRADES[projectGrade as TargetGrade] ?? projectGrade}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">UA値</p>
                  <p className="text-2xl font-bold">
                    {result.achievedUA.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">W/(m²K)</p>
                </div>
                {result.achievedEtaAC != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">etaAC</p>
                    <p className="text-2xl font-bold">
                      {result.achievedEtaAC.toFixed(1)}
                    </p>
                  </div>
                )}
                {result.achievedEtaAH != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">etaAH</p>
                    <p className="text-2xl font-bold">
                      {result.achievedEtaAH.toFixed(1)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">総コスト</p>
                  <p className="text-2xl font-bold">
                    {formatCost(result.totalCost)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Part Specs */}
          {specs && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>外皮仕様</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>部位</TableHead>
                        <TableHead>方位</TableHead>
                        <TableHead className="text-right">面積(m²)</TableHead>
                        <TableHead>断熱材</TableHead>
                        <TableHead className="text-right">厚さ(mm)</TableHead>
                        <TableHead className="text-right">U値</TableHead>
                        <TableHead className="text-right">コスト</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specs.parts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {PART_TYPE_LABELS[p.partType] ?? p.partType}
                          </TableCell>
                          <TableCell>
                            {p.orientation
                              ? ORIENTATION_LABELS[p.orientation] ?? p.orientation
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.area.toFixed(2)}
                          </TableCell>
                          <TableCell>{p.materialName || "-"}</TableCell>
                          <TableCell className="text-right">
                            {p.thickness || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.uValue.toFixed(3)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCost(p.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Opening Specs */}
              <Card>
                <CardHeader>
                  <CardTitle>開口部仕様</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>方位</TableHead>
                        <TableHead>種別</TableHead>
                        <TableHead className="text-right">面積(m²)</TableHead>
                        <TableHead>製品</TableHead>
                        <TableHead className="text-right">U値</TableHead>
                        <TableHead className="text-right">コスト</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {specs.openings.map((o, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {ORIENTATION_LABELS[o.orientation] ?? o.orientation}
                          </TableCell>
                          <TableCell>
                            {o.openingType === "window" ? "窓" : "ドア"}
                          </TableCell>
                          <TableCell className="text-right">
                            {o.area.toFixed(2)}
                          </TableCell>
                          <TableCell>{o.productName || "-"}</TableCell>
                          <TableCell className="text-right">
                            {o.uValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCost(o.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Foundation Spec */}
              <Card>
                <CardHeader>
                  <CardTitle>基礎仕様</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">外周長</p>
                      <p className="text-lg font-medium">
                        {specs.foundation.perimeterLength.toFixed(1)} m
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">線熱貫流率(psi)</p>
                      <p className="text-lg font-medium">
                        {specs.foundation.psiValue.toFixed(3)} W/(mK)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">コスト</p>
                      <p className="text-lg font-medium">
                        {formatCost(specs.foundation.cost)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
