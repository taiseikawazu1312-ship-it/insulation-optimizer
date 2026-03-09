import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();
    const prisma = await getPrisma();
    const orgId = session.user.organizationId;

    // 今月の開始日
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProjects,
      monthlyProjects,
      draftCount,
      calculatedCount,
      optimizedCount,
    ] = await Promise.all([
      prisma.project.count({
        where: { organizationId: orgId, isDeleted: false },
      }),
      prisma.project.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          createdAt: { gte: monthStart },
        },
      }),
      prisma.project.count({
        where: { organizationId: orgId, isDeleted: false, status: "draft" },
      }),
      prisma.project.count({
        where: { organizationId: orgId, isDeleted: false, status: "calculated" },
      }),
      prisma.project.count({
        where: { organizationId: orgId, isDeleted: false, status: "optimized" },
      }),
    ]);

    return successResponse({
      totalProjects,
      monthlyProjects,
      byStatus: {
        draft: draftCount,
        calculated: calculatedCount,
        optimized: optimizedCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
