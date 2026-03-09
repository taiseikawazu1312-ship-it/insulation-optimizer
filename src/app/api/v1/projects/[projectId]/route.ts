import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { updateProjectSchema } from "@/lib/validations/project";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId } = await params;
    const prisma = await getPrisma();

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.user.organizationId,
        isDeleted: false,
      },
      include: {
        createdByUser: { select: { id: true, name: true } },
        envelopeParts: {
          include: {
            insulationMaterial: { select: { id: true, name: true, conductivity: true } },
            additionalInsulation: { select: { id: true, name: true, conductivity: true } },
          },
        },
        openings: {
          include: {
            windowProduct: {
              select: {
                id: true, productLine: true, windowType: true, frameMaterial: true,
                uwValue: true, etaG: true, solarType: true, width: true, height: true,
              },
            },
            doorProduct: { select: { id: true, name: true, doorType: true, udValue: true } },
          },
        },
        foundationSpec: true,
        optimizationResults: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!project) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    return successResponse(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
    });
    if (!existing) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    const body = updateProjectSchema.parse(await req.json());

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { ...body, updatedBy: session.user.id },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
    });
    if (!existing) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { isDeleted: true, deletedAt: new Date(), updatedBy: session.user.id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
