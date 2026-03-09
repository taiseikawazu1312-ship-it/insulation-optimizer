import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import {
  optimize,
  type OptimizeInput,
  type OptPartInput,
  type OptOpeningInput,
  type OptFoundationInput,
  type MaterialOption,
  type WindowOption,
  type DoorOption,
} from "@/lib/calc/optimizer";

const optimizeRequestSchema = z.object({
  targetGrade: z.enum(["grade4", "grade5", "ZEH", "G1", "G2", "G3"]).optional(),
});

type Params = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId } = await params;
    const prisma = await getPrisma();

    const existing = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
    });
    if (!existing) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    const body = optimizeRequestSchema.parse(await req.json());

    const fullProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        envelopeParts: true,
        openings: true,
        foundationSpec: true,
      },
    });

    if (!fullProject) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    if (fullProject.envelopeParts.length === 0) {
      return errorResponse("外皮データが入力されていません", "NO_ENVELOPE_DATA", 422);
    }

    // マスタデータ取得
    const [insulationMaterials, windowProducts, doorProducts] = await Promise.all([
      prisma.insulationMaterial.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
      }),
      prisma.windowProduct.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
      }),
      prisma.doorProduct.findMany({
        where: { organizationId: session.user.organizationId, isActive: true },
      }),
    ]);

    if (insulationMaterials.length === 0) {
      return errorResponse("断熱材マスタが登録されていません", "NO_INSULATION_MATERIALS", 422);
    }

    const materials: MaterialOption[] = insulationMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      conductivity: m.conductivity,
      availableThicknesses: JSON.parse(m.thicknessOptions) as number[],
      costPerM2: JSON.parse(m.unitPricePerM2) as Record<number, number>,
      applicableParts: JSON.parse(m.applicableParts) as string[],
    }));

    const windows: WindowOption[] = windowProducts.map((w) => ({
      id: w.id,
      name: `${w.productLine} ${w.windowType}`,
      uwValue: w.uwValue,
      etaG: w.etaG ?? 0.5,
      etaGShading: w.solarType === "shielding" ? (w.etaG ?? 0.3) : undefined,
      frameMaterial: w.frameMaterial,
      costPerUnit: w.estimatedCost ?? w.listPrice ?? 0,
    }));

    const doors: DoorOption[] = doorProducts.map((d) => ({
      id: d.id,
      name: d.name,
      udValue: d.udValue,
      costPerUnit: d.listPrice ?? 0,
    }));

    const optParts: OptPartInput[] = fullProject.envelopeParts.map((ep) => ({
      partType: ep.partType,
      orientation: ep.orientation ?? undefined,
      area: ep.area,
      adjacentSpace: ep.adjacentSpace,
    }));

    const optOpenings: OptOpeningInput[] = fullProject.openings.map((o) => ({
      orientation: o.orientation,
      area: (o.width * o.height) / 1_000_000,
      openingType: o.openingType,
      attachment: o.attachment,
      tempDiffCoeff: 1.0,
    }));

    const fs = fullProject.foundationSpec;
    const optFoundation: OptFoundationInput = fs
      ? {
          perimeterLength: fs.perimeterLength,
          tempDiffCoeff: 1.0,
          slabArea: fs.slabArea ?? undefined,
          position: fs.insulationPosition,
          length: fs.insulationLength,
          slabEdge: fs.slabEdgePosition,
        }
      : {
          perimeterLength: 0,
          tempDiffCoeff: 1.0,
          position: "none",
          length: "none",
          slabEdge: "above_gl",
        };

    const targetGrade = body.targetGrade ?? fullProject.targetGrade;

    const optimizeInput: OptimizeInput = {
      region: fullProject.region,
      structureType: fullProject.structureType,
      targetGrade,
      parts: optParts,
      openings: optOpenings,
      foundation: optFoundation,
      materials,
      windows,
      doors,
    };

    const result = optimize(optimizeInput);

    // 結果をDB保存
    const savedResult = await prisma.$transaction(async (tx) => {
      const optResult = await tx.optimizationResult.create({
        data: {
          projectId,
          targetGrade,
          achievedUA: result.achievedUA,
          achievedEtaAC: result.achievedEtaAC,
          achievedEtaAH: result.achievedEtaAH,
          totalCost: result.totalCost,
          specsJson: JSON.stringify(result.specs),
          calculationJson: JSON.stringify({
            targetUA: result.targetUA,
            targetEtaAC: result.targetEtaAC,
            feasible: result.feasible,
          }),
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "optimized", updatedBy: session.user.id },
      });

      return optResult;
    });

    return successResponse({ resultId: savedResult.id, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
