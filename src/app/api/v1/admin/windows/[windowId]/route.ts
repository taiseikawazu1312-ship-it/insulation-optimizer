import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const updateWindowSchema = z.object({
  productLine: z.string().min(1).max(200).optional(),
  windowType: z.string().min(1).optional(),
  frameMaterial: z.enum(["resin", "wood", "composite", "metal"]).optional(),
  glassType: z.string().min(1).optional(),
  glassLayers: z.number().int().min(1).max(4).optional(),
  spacerType: z.string().optional().nullable(),
  gasFill: z.boolean().optional(),
  solarType: z.enum(["acquisition", "shielding"]).optional(),
  sizeCode: z.string().optional().nullable(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  sashWidth: z.number().positive().optional().nullable(),
  uwValue: z.number().positive().optional(),
  ugValue: z.number().positive().optional().nullable(),
  etaG: z.number().min(0).max(1).optional().nullable(),
  listPrice: z.number().int().nonnegative().optional().nullable(),
  estimatedCost: z.number().int().nonnegative().optional().nullable(),
  fireRated: z.boolean().optional(),
  manufacturer: z.string().max(200).optional(),
});

type Params = { params: Promise<{ windowId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("admin");
    const { windowId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.windowProduct.findFirst({
      where: { id: windowId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("窓製品が見つかりません", "NOT_FOUND", 404);
    }

    const body = updateWindowSchema.parse(await req.json());

    const updated = await prisma.windowProduct.update({
      where: { id: windowId },
      data: body,
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("admin");
    const { windowId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.windowProduct.findFirst({
      where: { id: windowId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("窓製品が見つかりません", "NOT_FOUND", 404);
    }

    await prisma.windowProduct.update({
      where: { id: windowId },
      data: { isActive: false },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
