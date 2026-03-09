import { NextRequest } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { requireRole } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";

const createUserSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  name: z.string().min(1, "名前は必須です").max(100),
  password: z.string().min(8, "パスワードは8文字以上必要です"),
  role: z.enum(["admin", "operator"]).default("operator"),
});

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const prisma = await getPrisma();

    const users = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return successResponse(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = createUserSchema.parse(await req.json());
    const prisma = await getPrisma();

    // 重複チェック
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return errorResponse("このメールアドレスは既に登録されています", "DUPLICATE_EMAIL", 409);
    }

    // ユーザー数制限チェック
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });
    if (org) {
      const userCount = await prisma.user.count({
        where: { organizationId: session.user.organizationId, isActive: true },
      });
      if (userCount >= org.maxUsers) {
        return errorResponse(
          `ユーザー数が上限（${org.maxUsers}名）に達しています`,
          "USER_LIMIT_EXCEEDED",
          422
        );
      }
    }

    const passwordHash = await hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId: session.user.organizationId,
        email: body.email,
        name: body.name,
        passwordHash,
        role: body.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
