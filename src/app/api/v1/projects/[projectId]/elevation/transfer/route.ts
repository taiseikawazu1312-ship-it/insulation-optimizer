import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

type Params = { params: Promise<{ projectId: string }> };

const DIR_MAP = [
  { key: "wallAreaN" as const, orientation: "N" },
  { key: "wallAreaE" as const, orientation: "E" },
  { key: "wallAreaS" as const, orientation: "S" },
  { key: "wallAreaW" as const, orientation: "W" },
];

export async function POST(_req: NextRequest, { params }: Params) {
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

    const elevation = await prisma.elevationCalc.findUnique({ where: { projectId } });
    if (!elevation) {
      return errorResponse("立面図面積データがありません", "NOT_FOUND", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 既存のwall型パーツのみ削除（天井・屋根・床等は保持）
      await tx.envelopePart.deleteMany({
        where: { projectId, partType: "wall" },
      });

      // 4方位の壁パーツを作成
      const parts = [];
      for (const { key, orientation } of DIR_MAP) {
        const area = elevation[key];
        if (area && area > 0) {
          parts.push({
            projectId,
            partType: "wall",
            orientation,
            area,
            adjacentSpace: "external_air",
          });
        }
      }

      if (parts.length > 0) {
        await tx.envelopePart.createMany({ data: parts });
      }

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return parts;
    });

    return successResponse({ transferred: result.length, parts: result });
  } catch (error) {
    return handleApiError(error);
  }
}
