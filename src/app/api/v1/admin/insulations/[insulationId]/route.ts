import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const updateInsulationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).optional(),
  conductivity: z.number().positive().optional(),
  applicableParts: z.array(z.string()).optional(),
  thicknessOptions: z.array(z.number().positive()).optional(),
  unitPricePerM2: z.record(z.string(), z.number().nonnegative()).optional(),
  density: z.number().positive().optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  productCode: z.string().max(100).optional().nullable(),
});

type Params = { params: Promise<{ insulationId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("admin");
    const { insulationId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.insulationMaterial.findFirst({
      where: { id: insulationId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("断熱材が見つかりません", "NOT_FOUND", 404);
    }

    const body = updateInsulationSchema.parse(await req.json());

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.conductivity !== undefined) data.conductivity = body.conductivity;
    if (body.applicableParts !== undefined) data.applicableParts = JSON.stringify(body.applicableParts);
    if (body.thicknessOptions !== undefined) data.thicknessOptions = JSON.stringify(body.thicknessOptions);
    if (body.unitPricePerM2 !== undefined) data.unitPricePerM2 = JSON.stringify(body.unitPricePerM2);
    if (body.density !== undefined) data.density = body.density;
    if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
    if (body.productCode !== undefined) data.productCode = body.productCode;

    const updated = await prisma.insulationMaterial.update({
      where: { id: insulationId },
      data,
    });

    return successResponse({
      ...updated,
      applicableParts: JSON.parse(updated.applicableParts),
      thicknessOptions: JSON.parse(updated.thicknessOptions),
      unitPricePerM2: JSON.parse(updated.unitPricePerM2),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("admin");
    const { insulationId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.insulationMaterial.findFirst({
      where: { id: insulationId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("断熱材が見つかりません", "NOT_FOUND", 404);
    }

    await prisma.insulationMaterial.update({
      where: { id: insulationId },
      data: { isActive: false },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
