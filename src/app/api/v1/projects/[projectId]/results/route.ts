import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId } = await params;
    const prisma = await getPrisma();

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
    });
    if (!project) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    const results = await prisma.optimizationResult.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    const parsed = results.map((r) => ({
      ...r,
      specs: JSON.parse(r.specsJson),
      calculation: JSON.parse(r.calculationJson),
    }));

    return successResponse(parsed);
  } catch (error) {
    return handleApiError(error);
  }
}
