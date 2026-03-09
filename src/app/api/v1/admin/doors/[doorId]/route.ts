import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const updateDoorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  doorType: z.enum(["entrance", "service"]).optional(),
  material: z.string().optional().nullable(),
  hasGlass: z.boolean().optional(),
  glassType: z.string().optional().nullable(),
  udValue: z.number().positive().optional(),
  listPrice: z.number().int().nonnegative().optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
});

type Params = { params: Promise<{ doorId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("admin");
    const { doorId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.doorProduct.findFirst({
      where: { id: doorId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("ドア製品が見つかりません", "NOT_FOUND", 404);
    }

    const body = updateDoorSchema.parse(await req.json());

    const updated = await prisma.doorProduct.update({
      where: { id: doorId },
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
    const { doorId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.doorProduct.findFirst({
      where: { id: doorId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("ドア製品が見つかりません", "NOT_FOUND", 404);
    }

    await prisma.doorProduct.update({
      where: { id: doorId },
      data: { isActive: false },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
