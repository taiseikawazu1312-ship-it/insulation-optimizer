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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TARGET_GRADES, type TargetGrade } from "@/types";

interface ComparisonResult {
  grade: string;
  achievedUA: number;
  achievedEtaAC: number | null;
  totalCost: number;
  feasible: boolean;
}

const ALL_GRADES: TargetGrade[] = [
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
  const [selectedGrades, setSelectedGrades] = useState<Set<TargetGrade>>(
    new Set(ALL_GRADES)
  );
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const projRes = await fetch(`/api/v1/projects/${projectId}`);
      if (projRes.ok) {
        const j = await projRes.json();
        if (j.success) {
          setProjectName(j.data.name);
          setProjectGrade(j.data.targetGrade);
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

  const toggleGrade = (grade: TargetGrade) => {
    setSelectedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) {
        next.delete(grade);
      } else {
        next.add(grade);
      }
      return next;
    });
  };

  const runComparison = async () => {
    const grades = Array.from(selectedGrades);
    if (grades.length < 2) {
      toast.error("比較には2つ以上の等級を選択してください");
      return;
    }

    setComparing(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/compare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grades }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("比較が完了しました");
        const mapped = (json.data.results ?? json.data).map(
          (r: { grade?: string; targetGrade?: string; achievedUA: number; achievedEtaAC?: number | null; totalCost: number; feasible?: boolean }) => ({
            grade: r.grade ?? r.targetGrade,
            achievedUA: r.achievedUA,
            achievedEtaAC: r.achievedEtaAC ?? null,
            totalCost: r.totalCost,
            feasible: r.feasible ?? true,
          })
        );
        setResults(mapped);
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

  const feasibleResults = results.filter((r) => r.feasible);
  const minCostResult =
    feasibleResults.length > 0
      ? feasibleResults.reduce((min, r) =>
          r.totalCost < min.totalCost ? r : min
        )
      : null;

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
          {comparing ? "比較中..." : "比較実行"}
        </Button>
      </div>

      {/* Grade Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">比較する等級を選択</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {ALL_GRADES.map((grade) => (
              <div key={grade} className="flex items-center gap-2">
                <Checkbox
                  id={`grade-${grade}`}
                  checked={selectedGrades.has(grade)}
                  onCheckedChange={() => toggleGrade(grade)}
                />
                <Label htmlFor={`grade-${grade}`} className="text-sm cursor-pointer">
                  {TARGET_GRADES[grade]}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Play className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              等級を選択して比較を実行してください
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
                    const isCurrentGrade = r.grade === projectGrade;
                    const costDiff =
                      minCostResult && r.feasible
                        ? r.totalCost - minCostResult.totalCost
                        : null;
                    return (
                      <TableRow
                        key={r.grade}
                        className={isCurrentGrade ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-medium">
                          {TARGET_GRADES[r.grade as TargetGrade] ??
                            r.grade}
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
            {feasibleResults
              .slice(0, 3)
              .map((r) => (
                <Card key={r.grade} size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {TARGET_GRADES[r.grade as TargetGrade] ??
                        r.grade}
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
    </>
  );
}
