import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { updateFoundationSchema } from "@/lib/validations/foundation";

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

    const foundation = await prisma.foundationSpec.findUnique({
      where: { projectId },
      include: {
        insulationMaterial: { select: { id: true, name: true, conductivity: true } },
      },
    });

    return successResponse(foundation);
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

    const body = updateFoundationSchema.parse(await req.json());

    const foundation = await prisma.$transaction(async (tx) => {
      const result = await tx.foundationSpec.upsert({
        where: { projectId },
        create: { projectId, ...body },
        update: body,
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return result;
    });

    return successResponse(foundation);
  } catch (error) {
    return handleApiError(error);
  }
}
