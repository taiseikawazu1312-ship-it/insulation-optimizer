"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { label: "立面図面積", segment: "elevation" },
  { label: "外皮", segment: "envelope" },
  { label: "開口部", segment: "openings" },
  { label: "基礎", segment: "foundation" },
  { label: "最適化", segment: "optimize" },
  { label: "比較", segment: "compare" },
] as const;

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const currentSegment = pathname.split("/").pop();

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <div className="flex gap-1 border-b">
        {STEPS.map((step) => {
          const href = `/projects/${projectId}/${step.segment}`;
          const isActive = currentSegment === step.segment;
          return (
            <Link
              key={step.segment}
              href={href}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {step.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
