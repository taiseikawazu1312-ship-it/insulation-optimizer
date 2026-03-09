import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const updateUserSchema = z.object({
  role: z.enum(["admin", "operator"]).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ userId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("admin");
    const { userId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.user.findFirst({
      where: { id: userId, organizationId: session.user.organizationId },
    });
    if (!existing) {
      return errorResponse("ユーザーが見つかりません", "NOT_FOUND", 404);
    }

    // 自分自身のロール変更は不可
    if (userId === session.user.id && (await req.clone().json()).role) {
      return errorResponse("自分自身のロールは変更できません", "SELF_ROLE_CHANGE", 422);
    }

    const body = updateUserSchema.parse(await req.json());

    const updated = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
