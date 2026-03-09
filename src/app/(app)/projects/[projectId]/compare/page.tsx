"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  XCircle,
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

interface ComparisonResult {
  targetGrade: string;
  achievedUA: number;
  achievedEtaAC: number | null;
  totalCost: number;
  feasible: boolean;
}

const COMPARISON_GRADES: TargetGrade[] = [
  "grade4",
  "grade5",
  "ZEH",
  "G1",
  "G2",
  "G3",
];

export default function ComparePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [projectName, setProjectName] = useState("");
  const [projectGrade, setProjectGrade] = useState("");
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, compareRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}`),
        fetch(`/api/v1/projects/${projectId}/compare`),
      ]);

      if (projRes.ok) {
        const j = await projRes.json();
        if (j.success) {
          setProjectName(j.data.name);
          setProjectGrade(j.data.targetGrade);
        }
      }

      if (compareRes.ok) {
        const j = await compareRes.json();
        if (j.success && j.data.length > 0) {
          setResults(j.data);
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

  const runComparison = async () => {
    setComparing(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/compare`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("比較が完了しました");
        setResults(json.data);
      } else {
        toast.error(json.error?.message ?? "比較に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setComparing(false);
    }
  };

  const formatCost = (cost: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(cost);

  const minCostResult = results.length > 0
    ? results.reduce((min, r) => (r.feasible && r.totalCost < min.totalCost ? r : min), results.find((r) => r.feasible) ?? results[0])
    : null;

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
            render={<Link href={`/projects/${projectId}/optimize`} />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">等級別比較</h1>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <Button size="sm" onClick={runComparison} disabled={comparing}>
          {comparing ? (
            <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
          ) : (
            <Play className="h-4 w-4" data-icon="inline-start" />
          )}
          {comparing ? "比較中..." : "全等級で比較"}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { label: "外皮", href: `/projects/${projectId}/envelope`, active: false },
          { label: "開口部", href: `/projects/${projectId}/openings`, active: false },
          { label: "基礎", href: `/projects/${projectId}/foundation`, active: false },
          { label: "最適化", href: `/projects/${projectId}/optimize`, active: false },
          { label: "比較", href: `/projects/${projectId}/compare`, active: true },
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

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Play className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              全等級での最適化比較を実行してください
            </p>
            <Button className="mt-4" onClick={runComparison} disabled={comparing}>
              {comparing ? "比較中..." : "比較を実行"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>等級別コスト比較</CardTitle>
              <CardDescription>
                現在の目標:{" "}
                {TARGET_GRADES[projectGrade as TargetGrade] ?? projectGrade}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>等級</TableHead>
                    <TableHead className="text-right">UA値</TableHead>
                    <TableHead className="text-right">etaAC</TableHead>
                    <TableHead className="text-right">総コスト</TableHead>
                    <TableHead className="text-right">差額</TableHead>
                    <TableHead className="text-center">達成</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const isCurrentGrade = r.targetGrade === projectGrade;
                    const costDiff =
                      minCostResult && r.feasible
                        ? r.totalCost - minCostResult.totalCost
                        : null;
                    return (
                      <TableRow
                        key={r.targetGrade}
                        className={isCurrentGrade ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-medium">
                          {TARGET_GRADES[r.targetGrade as TargetGrade] ??
                            r.targetGrade}
                          {isCurrentGrade && (
                            <Badge
                              variant="secondary"
                              className="ml-2 bg-primary/10 text-primary"
                            >
                              現在の目標
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.achievedUA.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.achievedEtaAC != null
                            ? r.achievedEtaAC.toFixed(1)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCost(r.totalCost)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {costDiff != null && costDiff > 0
                            ? `+${formatCost(costDiff)}`
                            : costDiff === 0
                              ? "-"
                              : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.feasible ? (
                            <CheckCircle className="mx-auto h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="mx-auto h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Cost Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {results
              .filter((r) => r.feasible)
              .slice(0, 3)
              .map((r) => (
                <Card key={r.targetGrade} size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {TARGET_GRADES[r.targetGrade as TargetGrade] ??
                        r.targetGrade}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCost(r.totalCost)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      UA={r.achievedUA.toFixed(2)} W/(m²K)
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
