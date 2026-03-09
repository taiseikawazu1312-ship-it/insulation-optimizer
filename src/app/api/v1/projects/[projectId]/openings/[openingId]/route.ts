import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { updateOpeningSchema } from "@/lib/validations/opening";

type Params = { params: Promise<{ projectId: string; openingId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId, openingId } = await params;
    const prisma = await getPrisma();

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
    });
    if (!project) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    const existing = await prisma.opening.findFirst({
      where: { id: openingId, projectId },
    });
    if (!existing) {
      return errorResponse("開口部が見つかりません", "NOT_FOUND", 404);
    }

    const body = updateOpeningSchema.parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.opening.update({
        where: { id: openingId },
        data: body,
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return result;
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId, openingId } = await params;
    const prisma = await getPrisma();

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
    });
    if (!project) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    const existing = await prisma.opening.findFirst({
      where: { id: openingId, projectId },
    });
    if (!existing) {
      return errorResponse("開口部が見つかりません", "NOT_FOUND", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.opening.delete({ where: { id: openingId } });
      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
