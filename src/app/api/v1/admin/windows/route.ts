import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const createWindowSchema = z.object({
  productLine: z.string().min(1).max(200),
  windowType: z.string().min(1),
  frameMaterial: z.enum(["resin", "wood", "composite", "metal"]),
  glassType: z.string().min(1),
  glassLayers: z.number().int().min(1).max(4),
  spacerType: z.string().optional().nullable(),
  gasFill: z.boolean().default(false),
  solarType: z.enum(["acquisition", "shielding"]).default("acquisition"),
  sizeCode: z.string().optional().nullable(),
  width: z.number().positive(),
  height: z.number().positive(),
  sashWidth: z.number().positive().optional().nullable(),
  uwValue: z.number().positive(),
  ugValue: z.number().positive().optional().nullable(),
  etaG: z.number().min(0).max(1).optional().nullable(),
  listPrice: z.number().int().nonnegative().optional().nullable(),
  estimatedCost: z.number().int().nonnegative().optional().nullable(),
  fireRated: z.boolean().default(false),
  manufacturer: z.string().max(200).default("YKK AP"),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const prisma = await getPrisma();

    const windows = await prisma.windowProduct.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: [{ productLine: "asc" }, { uwValue: "asc" }],
    });

    return successResponse(windows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = createWindowSchema.parse(await req.json());
    const prisma = await getPrisma();

    const window = await prisma.windowProduct.create({
      data: {
        organizationId: session.user.organizationId,
        ...body,
      },
    });

    return successResponse(window, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
