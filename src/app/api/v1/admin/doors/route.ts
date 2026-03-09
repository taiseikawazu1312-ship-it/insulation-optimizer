import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { successResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const createDoorSchema = z.object({
  name: z.string().min(1).max(200),
  doorType: z.enum(["entrance", "service"]),
  material: z.string().optional().nullable(),
  hasGlass: z.boolean().default(false),
  glassType: z.string().optional().nullable(),
  udValue: z.number().positive(),
  listPrice: z.number().int().nonnegative().optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();
    const prisma = await getPrisma();

    const doors = await prisma.doorProduct.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: [{ doorType: "asc" }, { udValue: "asc" }],
    });

    return successResponse(doors);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = createDoorSchema.parse(await req.json());
    const prisma = await getPrisma();

    const door = await prisma.doorProduct.create({
      data: {
        organizationId: session.user.organizationId,
        ...body,
      },
    });

    return successResponse(door, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
