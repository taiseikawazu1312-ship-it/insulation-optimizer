import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { updateElevationSchema } from "@/lib/validations/elevation";

type Params = { params: Promise<{ projectId: string }> };

function calcWallArea(widthMm: number | null, eaveHeightMm: number | null, windowsJson: string): number | null {
  if (!widthMm || !eaveHeightMm) return null;
  const windows: { area: number }[] = JSON.parse(windowsJson);
  const gross = (widthMm / 1000) * (eaveHeightMm / 1000);
  const windowTotal = windows.reduce((sum, w) => sum + (w.area || 0), 0);
  return Math.max(0, Math.round((gross - windowTotal) * 1000) / 1000);
}

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

    const elevation = await prisma.elevationCalc.findUnique({ where: { projectId } });
    if (!elevation) {
      return successResponse(null);
    }

    return successResponse({
      ...elevation,
      windowsN: JSON.parse(elevation.windowsN),
      windowsE: JSON.parse(elevation.windowsE),
      windowsS: JSON.parse(elevation.windowsS),
      windowsW: JSON.parse(elevation.windowsW),
    });
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

    const body = updateElevationSchema.parse(await req.json());
    const windowsN = JSON.stringify(body.windowsN);
    const windowsE = JSON.stringify(body.windowsE);
    const windowsS = JSON.stringify(body.windowsS);
    const windowsW = JSON.stringify(body.windowsW);
    const eaveHeight = body.eaveHeight ?? null;

    const data = {
      widthN: body.widthN ?? null,
      widthE: body.widthE ?? null,
      widthS: body.widthS ?? null,
      widthW: body.widthW ?? null,
      maxHeight: body.maxHeight ?? null,
      eaveHeight,
      firstFloorToEave: body.firstFloorToEave ?? null,
      windowsN,
      windowsE,
      windowsS,
      windowsW,
      wallAreaN: calcWallArea(body.widthN ?? null, eaveHeight, windowsN),
      wallAreaE: calcWallArea(body.widthE ?? null, eaveHeight, windowsE),
      wallAreaS: calcWallArea(body.widthS ?? null, eaveHeight, windowsS),
      wallAreaW: calcWallArea(body.widthW ?? null, eaveHeight, windowsW),
    };

    const elevation = await prisma.$transaction(async (tx) => {
      const result = await tx.elevationCalc.upsert({
        where: { projectId },
        create: { projectId, ...data },
        update: data,
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "draft", updatedBy: session.user.id },
      });

      return result;
    });

    return successResponse({
      ...elevation,
      windowsN: JSON.parse(elevation.windowsN),
      windowsE: JSON.parse(elevation.windowsE),
      windowsS: JSON.parse(elevation.windowsS),
      windowsW: JSON.parse(elevation.windowsW),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
