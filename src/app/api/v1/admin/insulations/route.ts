import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const createInsulationSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  conductivity: z.number().positive(),
  applicableParts: z.array(z.string()),
  thicknessOptions: z.array(z.number().positive()),
  unitPricePerM2: z.record(z.string(), z.number().nonnegative()),
  density: z.number().positive().optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  productCode: z.string().max(100).optional().nullable(),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();
    const prisma = await getPrisma();

    const materials = await prisma.insulationMaterial.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: { name: "asc" },
    });

    const parsed = materials.map((m) => ({
      ...m,
      applicableParts: JSON.parse(m.applicableParts),
      thicknessOptions: JSON.parse(m.thicknessOptions),
      unitPricePerM2: JSON.parse(m.unitPricePerM2),
    }));

    return successResponse(parsed);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = createInsulationSchema.parse(await req.json());
    const prisma = await getPrisma();

    const material = await prisma.insulationMaterial.create({
      data: {
        organizationId: session.user.organizationId,
        name: body.name,
        category: body.category,
        conductivity: body.conductivity,
        applicableParts: JSON.stringify(body.applicableParts),
        thicknessOptions: JSON.stringify(body.thicknessOptions),
        unitPricePerM2: JSON.stringify(body.unitPricePerM2),
        density: body.density ?? null,
        manufacturer: body.manufacturer ?? null,
        productCode: body.productCode ?? null,
      },
    });

    return successResponse(
      {
        ...material,
        applicableParts: body.applicableParts,
        thicknessOptions: body.thicknessOptions,
        unitPricePerM2: body.unitPricePerM2,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
