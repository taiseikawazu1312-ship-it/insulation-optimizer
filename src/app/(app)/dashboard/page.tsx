"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  CalendarPlus,
  PenLine,
  CheckCircle,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_COLORS,
  REGIONS,
  TARGET_GRADES,
  type ProjectStatus,
  type RegionNumber,
  type TargetGrade,
} from "@/types";

interface ProjectSummary {
  id: string;
  name: string;
  region: number;
  targetGrade: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalProjects: number;
  thisMonth: number;
  drafts: number;
  optimized: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    thisMonth: 0,
    drafts: 0,
    optimized: 0,
  });
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsRes, projectsRes] = await Promise.allSettled([
          fetch("/api/v1/stats"),
          fetch("/api/v1/projects?limit=10&sortBy=updatedAt&sortOrder=desc"),
        ]);

        // Handle stats response
        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const statsJson = await statsRes.value.json();
          if (statsJson.success) {
            setStats(statsJson.data);
          }
        }

        // Handle projects response
        if (projectsRes.status === "fulfilled" && projectsRes.value.ok) {
          const projectsJson = await projectsRes.value.json();
          if (projectsJson.success) {
            const projects: ProjectSummary[] = projectsJson.data;
            setRecentProjects(projects);

            // Fallback stats from projects data if stats API unavailable
            if (statsRes.status !== "fulfilled" || !statsRes.value.ok) {
              const total = projectsJson.pagination?.total ?? projects.length;
              const now = new Date();
              const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              setStats({
                totalProjects: total,
                thisMonth: projects.filter(
                  (p: ProjectSummary) => new Date(p.createdAt) >= thisMonthStart
                ).length,
                drafts: projects.filter((p: ProjectSummary) => p.status === "draft").length,
                optimized: projects.filter((p: ProjectSummary) => p.status === "optimized").length,
              });
            }
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const statCards = [
    {
      title: "全プロジェクト",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "今月のプロジェクト",
      value: stats.thisMonth,
      icon: CalendarPlus,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "下書き",
      value: stats.drafts,
      icon: PenLine,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "最適化済み",
      value: stats.optimized,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} size="sm">
            <CardContent className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">
                  {loading ? "-" : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>最近のプロジェクト</CardTitle>
          <CardAction>
            <Button size="sm" render={<Link href="/projects/new" />}>
              <Plus className="h-4 w-4" data-icon="inline-start" />
              新規作成
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                プロジェクトがありません
              </p>
              <Button
                size="sm"
                className="mt-4"
                render={<Link href="/projects/new" />}
              >
                <Plus className="h-4 w-4" data-icon="inline-start" />
                最初のプロジェクトを作成
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>プロジェクト名</TableHead>
                  <TableHead className="hidden md:table-cell">地域</TableHead>
                  <TableHead className="hidden md:table-cell">目標等級</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="hidden sm:table-cell">作成日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/projects/${project.id}/envelope`)
                    }
                  >
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {REGIONS[project.region as RegionNumber] ??
                        `${project.region}地域`}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {TARGET_GRADES[project.targetGrade as TargetGrade] ??
                        project.targetGrade}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          PROJECT_STATUS_COLORS[
                            project.status as ProjectStatus
                          ] ?? ""
                        }
                        variant="secondary"
                      >
                        {PROJECT_STATUSES[project.status as ProjectStatus] ??
                          project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {formatDate(project.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
