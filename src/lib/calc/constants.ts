// ===== 断熱最適化システム: 定数テーブル =====

// 表面熱伝達抵抗 [m2*K/W]
export const SURFACE_RESISTANCE = {
  interior: {
    roof: 0.09,
    ceiling: 0.09,
    wall: 0.11,
    floor: 0.15,
  },
  exterior_direct: {
    roof: 0.04,
    ceiling: 0.04,
    wall: 0.04,
    floor: 0.04,
  },
  exterior_indirect: {
    ceiling: 0.09,
    wall: 0.11,
    floor: 0.15,
  },
} as const;

// 面積比率（木造構法別）
export const AREA_RATIO = {
  timber_frame: {
    floor_beam: { insulation: 0.80, bridge: 0.20 },
    floor_joist: { insulation: 0.85, bridge: 0.15 },
    wall: { insulation: 0.83, bridge: 0.17 },
    ceiling: { insulation: 0.87, bridge: 0.13 },
    ceiling_blown: { insulation: 1.0, bridge: 0.0 },
    roof: { insulation: 0.86, bridge: 0.14 },
  },
  platform_frame: {
    floor: { insulation: 0.87, bridge: 0.13 },
    wall: { insulation: 0.87, bridge: 0.13 },
    ceiling: { insulation: 0.87, bridge: 0.13 },
    roof: { insulation: 0.87, bridge: 0.13 },
  },
} as const;

// 温度差係数
export const TEMP_DIFF_COEFF: Record<string, number> = {
  external_air: 1.0,
  attic_ventilated: 1.0,
  garage: 1.0,
  underfloor_ventilated: 0.7,
  attic_unventilated: 0.05,
  adjacent_unit: 0.05,
};

// 熱橋部の熱伝導率（木材: スギ・ヒノキ）[W/(m*K)]
export const BRIDGE_CONDUCTIVITY = 0.12;

// 代表的な建材の熱伝導率 [W/(m*K)]
export const MATERIAL_CONDUCTIVITY: Record<string, number> = {
  structural_plywood_12: 0.160,
  gypsum_board_12_5: 0.220,
  cedar_cypress: 0.120,
  concrete: 1.600,
  mortar: 1.500,
  siding: 0.170,
};

// 方位係数 nuC（冷房期）
export const NU_COOLING: Record<number, Record<string, number>> = {
  1: { N: 0.277, NE: 0.370, E: 0.522, SE: 0.527, S: 0.407, SW: 0.527, W: 0.522, NW: 0.370, top: 1.000 },
  2: { N: 0.292, NE: 0.378, E: 0.520, SE: 0.517, S: 0.401, SW: 0.517, W: 0.520, NW: 0.378, top: 1.000 },
  3: { N: 0.303, NE: 0.384, E: 0.518, SE: 0.504, S: 0.393, SW: 0.504, W: 0.518, NW: 0.384, top: 1.000 },
  4: { N: 0.310, NE: 0.387, E: 0.514, SE: 0.491, S: 0.386, SW: 0.491, W: 0.514, NW: 0.387, top: 1.000 },
  5: { N: 0.314, NE: 0.391, E: 0.513, SE: 0.482, S: 0.381, SW: 0.482, W: 0.513, NW: 0.391, top: 1.000 },
  6: { N: 0.319, NE: 0.395, E: 0.512, SE: 0.474, S: 0.377, SW: 0.474, W: 0.512, NW: 0.395, top: 1.000 },
  7: { N: 0.322, NE: 0.396, E: 0.508, SE: 0.465, S: 0.373, SW: 0.465, W: 0.508, NW: 0.396, top: 1.000 },
  8: { N: 0.340, NE: 0.410, E: 0.500, SE: 0.450, S: 0.360, SW: 0.450, W: 0.500, NW: 0.410, top: 1.000 },
};

// 方位係数 nuH（暖房期）
export const NU_HEATING: Record<number, Record<string, number>> = {
  1: { N: 0.247, NE: 0.271, E: 0.338, SE: 0.414, S: 0.434, SW: 0.414, W: 0.338, NW: 0.271, top: 1.000 },
  2: { N: 0.258, NE: 0.279, E: 0.340, SE: 0.410, S: 0.430, SW: 0.410, W: 0.340, NW: 0.279, top: 1.000 },
  3: { N: 0.268, NE: 0.285, E: 0.342, SE: 0.406, S: 0.425, SW: 0.406, W: 0.342, NW: 0.285, top: 1.000 },
  4: { N: 0.279, NE: 0.291, E: 0.343, SE: 0.400, S: 0.419, SW: 0.400, W: 0.343, NW: 0.291, top: 1.000 },
  5: { N: 0.282, NE: 0.294, E: 0.343, SE: 0.396, S: 0.416, SW: 0.396, W: 0.343, NW: 0.294, top: 1.000 },
  6: { N: 0.285, NE: 0.297, E: 0.343, SE: 0.392, S: 0.414, SW: 0.392, W: 0.343, NW: 0.297, top: 1.000 },
  7: { N: 0.290, NE: 0.299, E: 0.340, SE: 0.384, S: 0.408, SW: 0.384, W: 0.340, NW: 0.299, top: 1.000 },
  8: { N: 0.305, NE: 0.310, E: 0.335, SE: 0.370, S: 0.395, SW: 0.370, W: 0.335, NW: 0.310, top: 1.000 },
};

// 取得日射量補正係数
export const SOLAR_GAIN_CORRECTION = {
  cooling: 0.93,
  heating: 0.51,
} as const;

// フレーム材質別のガラス面積比率補正
export const FRAME_AREA_RATIO: Record<string, number> = {
  resin: 0.72,
  wood: 0.72,
  composite: 0.80,
  metal: 0.80,
};

// 窓U値簡略計算式の係数: Uw = a * Ug + b
export const WINDOW_U_COEFFICIENTS: Record<
  string,
  { multilayer: { a: number; b: number }; single: { a: number; b: number } }
> = {
  resin: { multilayer: { a: 0.659, b: 1.04 }, single: { a: 0.756, b: 0.85 } },
  wood: { multilayer: { a: 0.659, b: 1.04 }, single: { a: 0.756, b: 0.85 } },
  composite: { multilayer: { a: 0.800, b: 1.15 }, single: { a: 0.865, b: 1.26 } },
  metal: { multilayer: { a: 0.812, b: 1.51 }, single: { a: 0.871, b: 1.52 } },
};

// 付属部材の追加熱抵抗 deltaR [m2*K/W]
export const ATTACHMENT_DELTA_R: Record<string, number> = {
  shutter: 0.10,
  shoji: 0.18,
  none: 0,
};

// UA基準値テーブル
export const UA_STANDARDS: Record<string, Record<number, number | null>> = {
  grade4: { 1: 0.46, 2: 0.46, 3: 0.56, 4: 0.75, 5: 0.87, 6: 0.87, 7: 0.87, 8: null },
  grade5: { 1: 0.40, 2: 0.40, 3: 0.50, 4: 0.60, 5: 0.60, 6: 0.60, 7: 0.60, 8: 0.60 },
  ZEH: { 1: 0.40, 2: 0.40, 3: 0.50, 4: 0.60, 5: 0.60, 6: 0.60, 7: 0.60, 8: null },
  G1: { 1: 0.34, 2: 0.34, 3: 0.38, 4: 0.46, 5: 0.48, 6: 0.56, 7: 0.56, 8: null },
  G2: { 1: 0.28, 2: 0.28, 3: 0.28, 4: 0.34, 5: 0.34, 6: 0.46, 7: 0.46, 8: null },
  G3: { 1: 0.20, 2: 0.20, 3: 0.20, 4: 0.23, 5: 0.23, 6: 0.26, 7: 0.26, 8: null },
};

// etaAC基準値テーブル
export const ETA_AC_STANDARDS: Record<string, Record<number, number | null>> = {
  grade4: { 1: null, 2: null, 3: null, 4: null, 5: 3.0, 6: 2.8, 7: 2.7, 8: 6.7 },
  grade5: { 1: null, 2: null, 3: null, 4: null, 5: 2.0, 6: 1.5, 7: 1.4, 8: null },
};

// 基礎線熱貫流率 psi テーブル [W/(m*K)]
export const FOUNDATION_PSI: Record<string, Record<string, Record<string, number>>> = {
  none: {
    none: {
      above_gl: 0.99,
      below_gl: 1.80,
    },
  },
  external: {
    "0.4": { low: 0.99, mid: 0.86, high: 0.72 },
    "0.6": { low: 0.81, mid: 0.68, high: 0.57 },
    full: { low: 0.57, mid: 0.47, high: 0.38 },
  },
  internal: {
    "0.4": { low: 0.99, mid: 0.88, high: 0.76 },
    "0.6": { low: 0.93, mid: 0.79, high: 0.67 },
    full: { low: 0.76, mid: 0.63, high: 0.51 },
  },
};

export function getPsiRangeKey(thermalResistance: number): string {
  if (thermalResistance < 0.6) return "low";
  if (thermalResistance < 1.2) return "mid";
  return "high";
}

export function getFoundationPsi(
  position: string,
  length: string,
  slabEdge: string,
  thermalResistance?: number
): number {
  if (position === "none") {
    return FOUNDATION_PSI.none.none[slabEdge] ?? 0.99;
  }
  const posData = FOUNDATION_PSI[position];
  if (!posData || !posData[length]) return 0.99;
  const rangeKey = thermalResistance ? getPsiRangeKey(thermalResistance) : "low";
  return posData[length][rangeKey] ?? 0.99;
}

// 中空層の熱抵抗 [m2*K/W]
export const AIR_LAYER_RESISTANCE = 0.09;
