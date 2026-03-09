import {
  SURFACE_RESISTANCE,
  AREA_RATIO,
  TEMP_DIFF_COEFF,
  BRIDGE_CONDUCTIVITY,
  ATTACHMENT_DELTA_R,
} from "./constants";

// ===== 型定義 =====

export interface PartInput {
  partType: string;
  orientation?: string;
  area: number;
  adjacentSpace: string;
  insulationConductivity?: number;
  insulationThickness?: number;
  additionalConductivity?: number;
  additionalThickness?: number;
}

export interface OpeningInput {
  orientation: string;
  area: number;
  openingType: string;
  uwValue?: number;
  attachment?: string;
  tempDiffCoeff?: number;
}

export interface FoundationInput {
  perimeterLength: number;
  psiValue: number;
  tempDiffCoeff: number;
  slabArea?: number;
}

export interface PartDetail {
  partType: string;
  orientation?: string;
  area: number;
  uInsulation: number;
  uBridge: number;
  uValue: number;
  hCoeff: number;
  heatLoss: number;
}

export interface OpeningDetail {
  orientation: string;
  area: number;
  openingType: string;
  uValue: number;
  uCorrected: number;
  hCoeff: number;
  heatLoss: number;
}

export interface FoundationDetail {
  perimeterLength: number;
  psiValue: number;
  hCoeff: number;
  heatLoss: number;
}

export interface UAResult {
  ua: number;
  q: number;
  totalArea: number;
  partDetails: PartDetail[];
  openingDetails: OpeningDetail[];
  foundationDetail?: FoundationDetail;
}

// ===== ヘルパー関数 =====

function getInteriorResistance(partType: string): number {
  switch (partType) {
    case "roof":
      return SURFACE_RESISTANCE.interior.roof;
    case "ceiling":
      return SURFACE_RESISTANCE.interior.ceiling;
    case "wall":
    case "foundation_wall":
      return SURFACE_RESISTANCE.interior.wall;
    case "floor":
    case "slab":
      return SURFACE_RESISTANCE.interior.floor;
    default:
      return SURFACE_RESISTANCE.interior.wall;
  }
}

function getExteriorResistance(partType: string, adjacentSpace: string): number {
  const isDirect =
    adjacentSpace === "external_air" ||
    adjacentSpace === "attic_ventilated" ||
    adjacentSpace === "garage";

  if (isDirect) {
    switch (partType) {
      case "roof":
        return SURFACE_RESISTANCE.exterior_direct.roof;
      case "ceiling":
        return SURFACE_RESISTANCE.exterior_direct.ceiling;
      case "wall":
      case "foundation_wall":
        return SURFACE_RESISTANCE.exterior_direct.wall;
      case "floor":
      case "slab":
        return SURFACE_RESISTANCE.exterior_direct.floor;
      default:
        return SURFACE_RESISTANCE.exterior_direct.wall;
    }
  }

  // 間接（小屋裏・床下等を介する）
  const indirect = SURFACE_RESISTANCE.exterior_indirect;
  switch (partType) {
    case "ceiling":
      return indirect.ceiling;
    case "wall":
    case "foundation_wall":
      return indirect.wall;
    case "floor":
    case "slab":
      return indirect.floor;
    default:
      return indirect.ceiling;
  }
}

function getAreaRatios(
  structureType: string,
  partType: string
): { insulation: number; bridge: number } {
  if (structureType === "platform_frame") {
    const pf = AREA_RATIO.platform_frame;
    switch (partType) {
      case "floor":
        return pf.floor;
      case "wall":
        return pf.wall;
      case "ceiling":
        return pf.ceiling;
      case "roof":
        return pf.roof;
      default:
        return pf.wall;
    }
  }

  // timber_frame
  const tf = AREA_RATIO.timber_frame;
  switch (partType) {
    case "floor":
      return tf.floor_joist;
    case "wall":
      return tf.wall;
    case "ceiling":
      return tf.ceiling;
    case "roof":
      return tf.roof;
    default:
      return tf.wall;
  }
}

// 壁の場合、構造用合板12mm + 石膏ボード12.5mm の追加熱抵抗
const WALL_ADDITIONAL_R =
  0.012 / 0.16 + // 構造用合板12mm
  0.0125 / 0.22; // 石膏ボード12.5mm

function calculatePartUValues(
  part: PartInput,
  structureType: string
): { uInsulation: number; uBridge: number; uValue: number } {
  const ri = getInteriorResistance(part.partType);
  const ro = getExteriorResistance(part.partType, part.adjacentSpace);

  const lambda = part.insulationConductivity ?? 0;
  const thickness = part.insulationThickness ?? 0;
  const thicknessM = thickness / 1000;

  // 断熱部の熱抵抗
  let rtIns = ri + ro;
  if (lambda > 0 && thickness > 0) {
    rtIns += thicknessM / lambda;
  }

  // 熱橋部の熱抵抗（同じ厚さの木材として計算）
  let rtBridge = ri + ro;
  if (thickness > 0) {
    rtBridge += thicknessM / BRIDGE_CONDUCTIVITY;
  }

  // 壁の場合は構造用合板+石膏ボードを加算
  if (part.partType === "wall") {
    rtIns += WALL_ADDITIONAL_R;
    rtBridge += WALL_ADDITIONAL_R;
  }

  // 付加断熱がある場合
  if (
    part.additionalConductivity &&
    part.additionalConductivity > 0 &&
    part.additionalThickness &&
    part.additionalThickness > 0
  ) {
    const additionalR = part.additionalThickness / 1000 / part.additionalConductivity;
    rtIns += additionalR;
    // 付加断熱は断熱部にのみ加算（熱橋部は木材で連続するため含めない場合もあるが、
    // 付加断熱は柱の外側に施工するため熱橋部にも加算する）
    rtBridge += additionalR;
  }

  const uIns = rtIns > 0 ? 1 / rtIns : 999;
  const uBridge = rtBridge > 0 ? 1 / rtBridge : 999;

  // 面積比率法
  // foundation_wall, slab は熱橋なし（面積比率法を適用しない）
  if (part.partType === "foundation_wall" || part.partType === "slab") {
    return { uInsulation: uIns, uBridge: uIns, uValue: uIns };
  }

  const ratios = getAreaRatios(structureType, part.partType);
  const uValue = uIns * ratios.insulation + uBridge * ratios.bridge;

  return { uInsulation: uIns, uBridge, uValue };
}

// ===== メイン計算関数 =====

export function calculateUA(
  region: number,
  structureType: string,
  parts: PartInput[],
  openings: OpeningInput[],
  foundation?: FoundationInput
): UAResult {
  const partDetails: PartDetail[] = [];
  const openingDetails: OpeningDetail[] = [];
  let totalHeatLoss = 0;
  let totalArea = 0;

  // 1. 各部位の熱損失計算
  for (const part of parts) {
    const { uInsulation, uBridge, uValue } = calculatePartUValues(part, structureType);
    const hCoeff = TEMP_DIFF_COEFF[part.adjacentSpace] ?? 1.0;
    const heatLoss = part.area * uValue * hCoeff;

    totalHeatLoss += heatLoss;
    totalArea += part.area;

    partDetails.push({
      partType: part.partType,
      orientation: part.orientation,
      area: part.area,
      uInsulation,
      uBridge,
      uValue,
      hCoeff,
      heatLoss,
    });
  }

  // 2. 開口部の熱損失計算
  for (const opening of openings) {
    const uBase = opening.uwValue ?? 0;
    const hCoeff = opening.tempDiffCoeff ?? 1.0;
    const attachmentKey = opening.attachment ?? "none";
    const deltaR = ATTACHMENT_DELTA_R[attachmentKey] ?? 0;

    let uCorrected: number;
    if (deltaR > 0 && uBase > 0) {
      // 付属部材補正: U_corrected = 0.5 * Uw + 0.5 * (1/(1/Uw + deltaR))
      uCorrected = 0.5 * uBase + 0.5 * (1 / (1 / uBase + deltaR));
    } else {
      uCorrected = uBase;
    }

    const heatLoss = opening.area * uCorrected * hCoeff;
    totalHeatLoss += heatLoss;
    totalArea += opening.area;

    openingDetails.push({
      orientation: opening.orientation,
      area: opening.area,
      openingType: opening.openingType,
      uValue: uBase,
      uCorrected,
      hCoeff,
      heatLoss,
    });
  }

  // 3. 基礎の熱損失計算
  let foundationDetail: FoundationDetail | undefined;
  if (foundation) {
    const heatLoss = foundation.perimeterLength * foundation.psiValue * foundation.tempDiffCoeff;
    totalHeatLoss += heatLoss;
    // 基礎の外皮面積: 土間床面積があれば加算
    if (foundation.slabArea) {
      totalArea += foundation.slabArea;
    }

    foundationDetail = {
      perimeterLength: foundation.perimeterLength,
      psiValue: foundation.psiValue,
      hCoeff: foundation.tempDiffCoeff,
      heatLoss,
    };
  }

  // 4. UA値計算（小数第3位切り上げ）
  const uaRaw = totalArea > 0 ? totalHeatLoss / totalArea : 0;
  const ua = Math.ceil(uaRaw * 100) / 100;

  return {
    ua,
    q: totalHeatLoss,
    totalArea,
    partDetails,
    openingDetails,
    foundationDetail,
  };
}
