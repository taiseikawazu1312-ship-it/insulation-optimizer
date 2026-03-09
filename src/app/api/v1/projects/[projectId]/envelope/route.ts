import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { updateEnvelopeSchema } from "@/lib/validations/envelope";

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

    const parts = await prisma.envelopePart.findMany({
      where: { projectId },
      include: {
        insulationMaterial: { select: { id: true, name: true, conductivity: true, category: true } },
        additionalInsulation: { select: { id: true, name: true, conductivity: true, category: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(parts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
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

    const body = updateEnvelopeSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      await tx.envelopePart.deleteMany({ where: { projectId } });

      const parts = await Promise.all(
        body.parts.map((part) =>
          tx.envelopePart.create({
            data: {
              projectId,
              partType: part.partType,
              orientation: part.orientation ?? null,
              area: part.area,
              adjacentSpace: part.adjacentSpace,
              insulationMaterialId: part.insulationMaterialId ?? null,
              insulationThickness: part.insulationThickness ?? null,
              additionalInsulationId: part.additionalInsulationId ?? null,
              additionalThickness: part.additionalThickness ?? null,
            },
          })
        )
      );

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return parts;
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
