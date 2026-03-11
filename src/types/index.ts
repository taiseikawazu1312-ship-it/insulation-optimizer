// ========== 地域区分 ==========
export const REGIONS = {
  1: "1地域（北海道北部）",
  2: "2地域（北海道南部）",
  3: "3地域（東北北部）",
  4: "4地域（東北南部・北陸）",
  5: "5地域（関東・東海・近畿北部）",
  6: "6地域（関東・東海・近畿・中国・四国）",
  7: "7地域（九州・沖縄北部）",
  8: "8地域（沖縄南部）",
} as const;

export type RegionNumber = keyof typeof REGIONS;

// ========== 目標等級 ==========
export const TARGET_GRADES = {
  grade4: "省エネ基準（等級4）",
  grade5: "誘導基準（等級5）",
  ZEH: "ZEH基準",
  G1: "HEAT20 G1",
  G2: "HEAT20 G2",
  G3: "HEAT20 G3",
} as const;

export type TargetGrade = keyof typeof TARGET_GRADES;

// ========== 構造種別 ==========
export const STRUCTURE_TYPES = {
  timber_frame: "木造軸組構法",
  platform_frame: "枠組壁工法（2×4）",
} as const;

export type StructureType = keyof typeof STRUCTURE_TYPES;

// ========== プロジェクトステータス ==========
export const PROJECT_STATUSES = {
  draft: "下書き",
  calculated: "計算済",
  optimized: "最適化済",
} as const;

export type ProjectStatus = keyof typeof PROJECT_STATUSES;

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  calculated: "bg-blue-100 text-blue-700",
  optimized: "bg-green-100 text-green-700",
};

// ========== 部位タイプ ==========
export const PART_TYPES = {
  ceiling: "天井",
  roof: "屋根",
  wall: "壁",
  floor: "床",
  foundation_wall: "基礎壁",
  slab: "土間床",
} as const;

export type PartType = keyof typeof PART_TYPES;

// ========== 方位 ==========
export const ORIENTATIONS = {
  N: "北",
  NE: "北東",
  E: "東",
  SE: "南東",
  S: "南",
  SW: "南西",
  W: "西",
  NW: "北西",
  top: "上面",
} as const;

export type Orientation = keyof typeof ORIENTATIONS;

// ========== 隣接空間 ==========
export const ADJACENT_SPACES = {
  external_air: "外気に直接",
  attic_ventilated: "外気に通じる小屋裏",
  underfloor_ventilated: "外気に通じる床下",
  garage: "外気に通じるガレージ",
  attic_unventilated: "外気に通じない小屋裏",
  adjacent_unit: "住戸間",
} as const;

// ========== 開口部タイプ ==========
export const OPENING_TYPES = {
  window: "窓",
  door: "ドア",
} as const;

// ========== 窓タイプ ==========
export const WINDOW_TYPES = {
  sliding: "引違い窓",
  casement_vertical: "たてすべり出し窓",
  casement: "すべり出し窓",
  fixed: "FIX窓",
  hung: "片上げ下げ窓",
  awning: "外倒し窓",
  high_casement: "高所用すべり出し窓",
  terrace_sliding: "引違いテラス戸",
  terrace_door: "テラスドア",
} as const;

// ========== フレーム材質 ==========
export const FRAME_MATERIALS = {
  resin: "樹脂",
  wood: "木製",
  composite: "金属・樹脂複合",
  metal: "金属",
} as const;

// ========== 日射タイプ ==========
export const SOLAR_TYPES = {
  acquisition: "日射取得型",
  shielding: "日射遮蔽型",
} as const;

// ========== 断熱材カテゴリ ==========
export const INSULATION_CATEGORIES = {
  glass_wool: "グラスウール",
  rock_wool: "ロックウール",
  rigid_urethane: "硬質ウレタンフォーム",
  phenol_foam: "フェノールフォーム",
  xps: "押出法ポリスチレンフォーム",
  eps: "ビーズ法ポリスチレンフォーム",
  cellulose: "セルロースファイバー",
  spray_urethane: "吹付硬質ウレタン",
} as const;

// ========== 付属部材 ==========
export const ATTACHMENTS = {
  none: "なし",
  shutter: "シャッター",
  shoji: "障子",
} as const;

// ========== 基礎タイプ ==========
export const FOUNDATION_TYPES = {
  spread: "布基礎",
  slab: "べた基礎",
} as const;

// ========== 基礎断熱位置 ==========
export const INSULATION_POSITIONS = {
  external: "外断熱",
  internal: "内断熱",
  none: "なし",
} as const;

// ========== 基礎断熱範囲 ==========
export const INSULATION_LENGTHS = {
  "0.4": "0.4m",
  "0.6": "0.6m",
  full: "全面",
  none: "なし",
} as const;

// ========== ロール ==========
export const ROLES = {
  admin: "管理者",
  operator: "オペレーター",
} as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 2,
  operator: 1,
};

// ========== ドアタイプ ==========
export const DOOR_TYPES = {
  entrance: "玄関ドア",
  service: "勝手口ドア",
} as const;

// ========== API Response Types ==========
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: { message: string; code: string };
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
