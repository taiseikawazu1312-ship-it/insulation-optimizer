import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { createOpeningSchema } from "@/lib/validations/opening";

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

    const openings = await prisma.opening.findMany({
      where: { projectId },
      include: {
        windowProduct: {
          select: {
            id: true, productLine: true, windowType: true, frameMaterial: true,
            uwValue: true, etaG: true, solarType: true, width: true, height: true,
          },
        },
        doorProduct: {
          select: { id: true, name: true, doorType: true, udValue: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(openings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
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

    const body = createOpeningSchema.parse(await req.json());

    const opening = await prisma.$transaction(async (tx) => {
      const created = await tx.opening.create({
        data: { projectId, ...body },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return created;
    });

    return successResponse(opening, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

const bulkOpeningsSchema = z.object({
  openings: z.array(createOpeningSchema).min(1, "開口部を1つ以上入力してください"),
});

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

    const body = bulkOpeningsSchema.parse(await req.json());

    const result = await prisma.$transaction(async (tx) => {
      await tx.opening.deleteMany({ where: { projectId } });

      const openings = await Promise.all(
        body.openings.map((o) =>
          tx.opening.create({
            data: { projectId, ...o },
          })
        )
      );

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return openings;
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
