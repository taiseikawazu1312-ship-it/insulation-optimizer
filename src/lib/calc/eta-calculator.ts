import {
  NU_COOLING,
  NU_HEATING,
  SOLAR_GAIN_CORRECTION,
  FRAME_AREA_RATIO,
} from "./constants";

// ===== 型定義 =====

export interface EtaPartInput {
  partType: string;
  orientation: string;
  area: number;
  uValue: number;
  adjacentSpace: string;
}

export interface EtaOpeningInput {
  orientation: string;
  area: number;
  frameMaterial: string;
  etaG: number;
  hasSunshade: boolean;
}

export interface EtaDetail {
  type: "opaque" | "opening";
  orientation: string;
  area: number;
  etaCooling: number;
  etaHeating: number;
  mCooling: number;
  mHeating: number;
}

export interface EtaResult {
  etaAC: number;
  etaAH: number;
  mC: number;
  mH: number;
  totalArea: number;
  details: EtaDetail[];
}

// ===== メイン計算関数 =====

export function calculateEta(
  region: number,
  parts: EtaPartInput[],
  openings: EtaOpeningInput[],
  totalArea: number
): EtaResult {
  const nuC = NU_COOLING[region];
  const nuH = NU_HEATING[region];
  if (!nuC || !nuH) {
    throw new Error(`Invalid region: ${region}`);
  }

  const fC = SOLAR_GAIN_CORRECTION.cooling;
  const fH = SOLAR_GAIN_CORRECTION.heating;
  const details: EtaDetail[] = [];
  let mC = 0;
  let mH = 0;

  // 1. 不透明部位の日射熱取得
  for (const part of parts) {
    const orient = part.orientation;
    const nuCValue = nuC[orient] ?? 0;
    const nuHValue = nuH[orient] ?? 0;

    // eta = 0.034 * U * nu * fsh (fsh = 1.0: 日除けなし)
    const etaCooling = 0.034 * part.uValue * nuCValue;
    const etaHeating = 0.034 * part.uValue * nuHValue;

    const mCContrib = part.area * etaCooling;
    const mHContrib = part.area * etaHeating;
    mC += mCContrib;
    mH += mHContrib;

    details.push({
      type: "opaque",
      orientation: orient,
      area: part.area,
      etaCooling,
      etaHeating,
      mCooling: mCContrib,
      mHeating: mHContrib,
    });
  }

  // 2. 開口部の日射熱取得
  for (const opening of openings) {
    const orient = opening.orientation;
    const nuCValue = nuC[orient] ?? 0;
    const nuHValue = nuH[orient] ?? 0;
    const frameRatio = FRAME_AREA_RATIO[opening.frameMaterial] ?? 0.80;

    // etaD = etaG * frameAreaRatio
    const etaD = opening.etaG * frameRatio;

    // eta = etaD * nu * f
    const etaCooling = etaD * nuCValue * fC;
    const etaHeating = etaD * nuHValue * fH;

    const mCContrib = opening.area * etaCooling;
    const mHContrib = opening.area * etaHeating;
    mC += mCContrib;
    mH += mHContrib;

    details.push({
      type: "opening",
      orientation: orient,
      area: opening.area,
      etaCooling,
      etaHeating,
      mCooling: mCContrib,
      mHeating: mHContrib,
    });
  }

  // 3. etaAC, etaAH 計算（小数第3位切り上げ -> 第2位まで）
  const etaACRaw = totalArea > 0 ? (mC / totalArea) * 100 : 0;
  const etaAHRaw = totalArea > 0 ? (mH / totalArea) * 100 : 0;
  const etaAC = Math.ceil(etaACRaw * 10) / 10;
  const etaAH = Math.ceil(etaAHRaw * 10) / 10;

  return {
    etaAC,
    etaAH,
    mC,
    mH,
    totalArea,
    details,
  };
}
