"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Thermometer,
  LayoutDashboard,
  FolderOpen,
  Plus,
  Layers,
  AppWindow,
  DoorOpen,
  Users,
  LogOut,
  Loader2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  {
    label: "ダッシュボード",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "プロジェクト一覧",
    href: "/projects",
    icon: <FolderOpen className="h-4 w-4" />,
  },
  {
    label: "新規作成",
    href: "/projects/new",
    icon: <Plus className="h-4 w-4" />,
  },
];

const adminNavItems: NavItem[] = [
  {
    label: "断熱材マスタ",
    href: "/admin/insulations",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    label: "窓マスタ",
    href: "/admin/windows",
    icon: <AppWindow className="h-4 w-4" />,
  },
  {
    label: "ドアマスタ",
    href: "/admin/doors",
    icon: <DoorOpen className="h-4 w-4" />,
  },
  {
    label: "ユーザー管理",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "ダッシュボード",
  "/projects": "プロジェクト一覧",
  "/projects/new": "新規作成",
  "/admin/insulations": "断熱材マスタ",
  "/admin/windows": "窓マスタ",
  "/admin/doors": "ドアマスタ",
  "/admin/users": "ユーザー管理",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = (session.user as Record<string, unknown>).role === "admin";
  const currentPageTitle =
    pageTitles[pathname] || "断熱仕様最適化システム";
  const roleLabel = isAdmin ? "管理者" : "オペレーター";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex w-[240px] flex-col border-r bg-muted/30">
        {/* Sidebar Header */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Thermometer className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            断熱最適化
          </span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {/* Main Navigation */}
            {mainNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </div>
              </Link>
            ))}

            {/* Admin Section */}
            {isAdmin && (
              <>
                <Separator className="my-2" />
                <div className="px-3 py-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    管理メニュー
                  </span>
                </div>
                {adminNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </div>
                  </Link>
                ))}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer - User Info */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {session.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {session.user?.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {session.user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
          <h1 className="text-lg font-semibold">{currentPageTitle}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {session.user?.name}
              </span>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
