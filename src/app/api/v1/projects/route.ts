import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, paginatedResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { createProjectSchema, listProjectsSchema } from "@/lib/validations/project";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const params = listProjectsSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    const { page, limit, status, search, sortBy, sortOrder } = params;
    const prisma = await getPrisma();

    const where = {
      organizationId: session.user.organizationId,
      isDeleted: false,
      ...(status && { status }),
      ...(search && { name: { contains: search } }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdByUser: { select: { id: true, name: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return paginatedResponse(projects, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = createProjectSchema.parse(await req.json());
    const prisma = await getPrisma();

    const project = await prisma.project.create({
      data: {
        ...body,
        organizationId: session.user.organizationId,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
    });

    return successResponse(project, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
