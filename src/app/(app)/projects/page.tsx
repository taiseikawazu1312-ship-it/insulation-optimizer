"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_COLORS,
  REGIONS,
  TARGET_GRADES,
  type ProjectStatus,
  type RegionNumber,
  type TargetGrade,
} from "@/types";

interface Project {
  id: string;
  name: string;
  region: number;
  targetGrade: string;
  totalFloorArea: number;
  status: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          sortBy: "updatedAt",
          sortOrder: "desc",
        });
        if (search) params.set("search", search);
        if (statusFilter && statusFilter !== "all")
          params.set("status", statusFilter);

        const res = await fetch(`/api/v1/projects?${params}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) {
          setProjects(json.data);
          if (json.pagination) setPagination(json.pagination);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchProjects(1);
  }, [fetchProjects]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/projects/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("プロジェクトを削除しました");
        setDeleteTarget(null);
        fetchProjects(pagination.page);
      } else {
        toast.error(json.error?.message ?? "削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">プロジェクト一覧</h1>
        <Button size="sm" render={<Link href="/projects/new" />}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          新規作成
        </Button>
      </div>

      {/* Filters */}
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {Object.entries(PROJECT_STATUSES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="プロジェクト名で検索..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            検索
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            プロジェクト ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "条件に一致するプロジェクトがありません"
                  : "プロジェクトがありません"}
              </p>
              {!search && statusFilter === "all" && (
                <Button
                  size="sm"
                  className="mt-4"
                  render={<Link href="/projects/new" />}
                >
                  <Plus className="h-4 w-4" data-icon="inline-start" />
                  最初のプロジェクトを作成
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>プロジェクト名</TableHead>
                    <TableHead className="hidden md:table-cell">
                      地域
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      目標等級
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      延床面積
                    </TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      作成日
                    </TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
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
                        {TARGET_GRADES[
                          project.targetGrade as TargetGrade
                        ] ?? project.targetGrade}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {project.totalFloorArea.toFixed(1)} m²
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
                          {PROJECT_STATUSES[
                            project.status as ProjectStatus
                          ] ?? project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(project.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/projects/${project.id}/envelope`
                              );
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(project);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {pagination.total} 件中{" "}
                    {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    件を表示
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchProjects(pagination.page - 1)}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchProjects(pagination.page + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロジェクトの削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.name}」を削除してもよろしいですか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
