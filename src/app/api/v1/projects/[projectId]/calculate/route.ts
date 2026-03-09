import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getPrisma } from "@/lib/prisma";
import { calculateUA, type PartInput, type OpeningInput, type FoundationInput } from "@/lib/calc/ua-calculator";
import { calculateEta, type EtaPartInput, type EtaOpeningInput } from "@/lib/calc/eta-calculator";
import { getFoundationPsi, UA_STANDARDS, ETA_AC_STANDARDS } from "@/lib/calc/constants";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { projectId } = await params;
    const prisma = await getPrisma();

    const fullProject = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.user.organizationId, isDeleted: false },
      include: {
        envelopeParts: {
          include: { insulationMaterial: true, additionalInsulation: true },
        },
        openings: {
          include: { windowProduct: true, doorProduct: true },
        },
        foundationSpec: {
          include: { insulationMaterial: true },
        },
      },
    });

    if (!fullProject) {
      return errorResponse("プロジェクトが見つかりません", "NOT_FOUND", 404);
    }

    if (fullProject.envelopeParts.length === 0) {
      return errorResponse("外皮データが入力されていません", "NO_ENVELOPE_DATA", 422);
    }

    // UA計算用の入力構築
    const parts: PartInput[] = fullProject.envelopeParts.map((ep) => ({
      partType: ep.partType,
      orientation: ep.orientation ?? undefined,
      area: ep.area,
      adjacentSpace: ep.adjacentSpace,
      insulationConductivity: ep.insulationMaterial?.conductivity ?? undefined,
      insulationThickness: ep.insulationThickness ?? undefined,
      additionalConductivity: ep.additionalInsulation?.conductivity ?? undefined,
      additionalThickness: ep.additionalThickness ?? undefined,
    }));

    const openings: OpeningInput[] = fullProject.openings.map((o) => {
      const area = (o.width * o.height) / 1_000_000;
      const uwValue =
        o.openingType === "door"
          ? o.doorProduct?.udValue ?? 4.65
          : o.windowProduct?.uwValue ?? 4.65;

      return {
        orientation: o.orientation,
        area,
        openingType: o.openingType,
        uwValue,
        attachment: o.attachment,
        tempDiffCoeff: 1.0,
      };
    });

    let foundationInput: FoundationInput | undefined;
    if (fullProject.foundationSpec) {
      const fs = fullProject.foundationSpec;
      const psiValue = getFoundationPsi(
        fs.insulationPosition,
        fs.insulationLength,
        fs.slabEdgePosition,
        fs.insulationMaterial
          ? (fs.insulationMaterial.conductivity > 0 ? 1 / fs.insulationMaterial.conductivity : 0)
          : undefined
      );
      foundationInput = {
        perimeterLength: fs.perimeterLength,
        psiValue,
        tempDiffCoeff: 1.0,
        slabArea: fs.slabArea ?? undefined,
      };
    }

    // UA計算実行
    const uaResult = calculateUA(
      fullProject.region,
      fullProject.structureType,
      parts,
      openings,
      foundationInput
    );

    // etaAC/etaAH計算
    const etaPartInputs: EtaPartInput[] = uaResult.partDetails
      .filter((d) => d.orientation != null)
      .map((d) => ({
        partType: d.partType,
        orientation: d.orientation!,
        area: d.area,
        uValue: d.uValue,
        adjacentSpace: "external_air",
      }));

    const etaOpeningInputs: EtaOpeningInput[] = fullProject.openings
      .filter((o) => o.openingType === "window" && o.windowProduct)
      .map((o) => ({
        orientation: o.orientation,
        area: (o.width * o.height) / 1_000_000,
        frameMaterial: o.windowProduct!.frameMaterial,
        etaG: o.windowProduct!.etaG ?? 0,
        hasSunshade: o.hasSunshade,
      }));

    const etaResult = calculateEta(
      fullProject.region,
      etaPartInputs,
      etaOpeningInputs,
      uaResult.totalArea
    );

    // 基準値判定
    const targetUA = UA_STANDARDS[fullProject.targetGrade]?.[fullProject.region] ?? null;
    const targetEtaAC = ETA_AC_STANDARDS[fullProject.targetGrade]?.[fullProject.region] ?? null;
    const uaPass = targetUA != null ? uaResult.ua <= targetUA : null;
    const etaPass = targetEtaAC != null ? etaResult.etaAC <= targetEtaAC : null;

    // 計算結果をDB更新
    await prisma.$transaction(async (tx) => {
      for (const detail of uaResult.partDetails) {
        const ep = fullProject.envelopeParts.find(
          (e) =>
            e.partType === detail.partType &&
            e.orientation === (detail.orientation ?? null) &&
            e.area === detail.area
        );
        if (ep) {
          await tx.envelopePart.update({
            where: { id: ep.id },
            data: { uValue: detail.uValue, heatLoss: detail.heatLoss },
          });
        }
      }

      for (const detail of uaResult.openingDetails) {
        const op = fullProject.openings.find(
          (o) =>
            o.orientation === detail.orientation &&
            Math.abs((o.width * o.height) / 1_000_000 - detail.area) < 0.001
        );
        if (op) {
          await tx.opening.update({
            where: { id: op.id },
            data: { uwValue: detail.uCorrected, heatLoss: detail.heatLoss },
          });
        }
      }

      if (fullProject.foundationSpec && uaResult.foundationDetail) {
        await tx.foundationSpec.update({
          where: { id: fullProject.foundationSpec.id },
          data: { psiValue: uaResult.foundationDetail.psiValue },
        });
      }

      await tx.project.update({
        where: { id: projectId },
        data: { status: "calculated", updatedBy: session.user.id },
      });
    });

    return successResponse({
      ua: uaResult.ua,
      q: uaResult.q,
      totalArea: uaResult.totalArea,
      etaAC: etaResult.etaAC,
      etaAH: etaResult.etaAH,
      targetUA,
      targetEtaAC,
      uaPass,
      etaPass,
      partDetails: uaResult.partDetails,
      openingDetails: uaResult.openingDetails,
      foundationDetail: uaResult.foundationDetail,
      etaDetails: etaResult.details,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
