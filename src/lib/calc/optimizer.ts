import { calculateUA, type PartInput, type OpeningInput, type FoundationInput } from "./ua-calculator";
import { calculateEta, type EtaPartInput, type EtaOpeningInput } from "./eta-calculator";
import { UA_STANDARDS, ETA_AC_STANDARDS, FRAME_AREA_RATIO, getFoundationPsi } from "./constants";

// ===== 型定義 =====

export interface MaterialOption {
  id: string;
  name: string;
  conductivity: number;       // lambda [W/(m*K)]
  availableThicknesses: number[]; // mm
  costPerM2: Record<number, number>; // thickness -> cost per m2
  applicableParts: string[];  // ceiling | roof | wall | floor
}

export interface WindowOption {
  id: string;
  name: string;
  uwValue: number;
  etaG: number;
  etaGShading?: number;      // 日射遮蔽型の場合のetaG
  frameMaterial: string;
  costPerUnit: number;
}

export interface DoorOption {
  id: string;
  name: string;
  udValue: number;
  costPerUnit: number;
}

export interface OptPartInput {
  partType: string;
  orientation?: string;
  area: number;
  adjacentSpace: string;
}

export interface OptOpeningInput {
  orientation: string;
  area: number;
  openingType: string;       // window | door
  attachment?: string;
  tempDiffCoeff?: number;
}

export interface OptFoundationInput {
  perimeterLength: number;
  tempDiffCoeff: number;
  slabArea?: number;
  position: string;          // external | internal | none
  length: string;            // 0.4 | 0.6 | full | none
  slabEdge: string;          // above_gl | below_gl
}

export interface PartSpec {
  partType: string;
  orientation?: string;
  area: number;
  materialId: string;
  materialName: string;
  thickness: number;
  uValue: number;
  cost: number;
}

export interface OpeningSpec {
  orientation: string;
  area: number;
  openingType: string;
  productId: string;
  productName: string;
  uValue: number;
  etaG?: number;
  cost: number;
}

export interface FoundationSpec {
  perimeterLength: number;
  psiValue: number;
  cost: number;
}

export interface OptimizeInput {
  region: number;
  structureType: string;
  targetGrade: string;
  parts: OptPartInput[];
  openings: OptOpeningInput[];
  foundation: OptFoundationInput;
  materials: MaterialOption[];
  windows: WindowOption[];
  doors: DoorOption[];
}

export interface OptimizationOutput {
  achievedUA: number;
  achievedEtaAC: number;
  achievedEtaAH: number;
  totalCost: number;
  targetUA: number;
  targetEtaAC: number | null;
  specs: {
    parts: PartSpec[];
    openings: OpeningSpec[];
    foundation: FoundationSpec;
  };
  feasible: boolean;
}

// ===== 内部型 =====

interface PartAssignment {
  partInput: OptPartInput;
  materialIdx: number;
  thicknessIdx: number;
  applicableMaterials: number[]; // indices into materials array
}

interface OpeningAssignment {
  openingInput: OptOpeningInput;
  productIdx: number;
  useShading: boolean;
  applicableProducts: number[]; // indices into windows or doors array
}

// ===== ヘルパー =====

function getTargetUA(grade: string, region: number): number | null {
  return UA_STANDARDS[grade]?.[region] ?? null;
}

function getTargetEtaAC(grade: string, region: number): number | null {
  return ETA_AC_STANDARDS[grade]?.[region] ?? null;
}

function buildPartInputs(
  assignments: PartAssignment[],
  materials: MaterialOption[]
): PartInput[] {
  return assignments.map((a) => {
    const mat = materials[a.materialIdx];
    const thickness = mat ? mat.availableThicknesses[a.thicknessIdx] ?? 0 : 0;
    return {
      partType: a.partInput.partType,
      orientation: a.partInput.orientation,
      area: a.partInput.area,
      adjacentSpace: a.partInput.adjacentSpace,
      insulationConductivity: mat?.conductivity ?? 0,
      insulationThickness: thickness,
    };
  });
}

function buildOpeningInputs(
  assignments: OpeningAssignment[],
  windows: WindowOption[],
  doors: DoorOption[]
): OpeningInput[] {
  return assignments.map((a) => {
    if (a.openingInput.openingType === "door") {
      const door = doors[a.productIdx];
      return {
        orientation: a.openingInput.orientation,
        area: a.openingInput.area,
        openingType: "door",
        uwValue: door?.udValue ?? 4.65,
        attachment: a.openingInput.attachment,
        tempDiffCoeff: a.openingInput.tempDiffCoeff,
      };
    }
    const win = windows[a.productIdx];
    const etaG = a.useShading && win?.etaGShading != null ? win.etaGShading : win?.etaG;
    return {
      orientation: a.openingInput.orientation,
      area: a.openingInput.area,
      openingType: "window",
      uwValue: win?.uwValue ?? 4.65,
      attachment: a.openingInput.attachment,
      tempDiffCoeff: a.openingInput.tempDiffCoeff,
    };
  });
}

function buildEtaOpeningInputs(
  assignments: OpeningAssignment[],
  windows: WindowOption[]
): EtaOpeningInput[] {
  return assignments
    .filter((a) => a.openingInput.openingType === "window")
    .map((a) => {
      const win = windows[a.productIdx];
      const etaG =
        a.useShading && win?.etaGShading != null ? win.etaGShading : (win?.etaG ?? 0);
      return {
        orientation: a.openingInput.orientation,
        area: a.openingInput.area,
        frameMaterial: win?.frameMaterial ?? "metal",
        etaG,
        hasSunshade: a.useShading,
      };
    });
}

function calculateTotalCost(
  partAssignments: PartAssignment[],
  openingAssignments: OpeningAssignment[],
  materials: MaterialOption[],
  windows: WindowOption[],
  doors: DoorOption[]
): number {
  let cost = 0;

  for (const a of partAssignments) {
    const mat = materials[a.materialIdx];
    if (!mat) continue;
    const thickness = mat.availableThicknesses[a.thicknessIdx] ?? 0;
    const unitCost = mat.costPerM2[thickness] ?? 0;
    cost += unitCost * a.partInput.area;
  }

  for (const a of openingAssignments) {
    if (a.openingInput.openingType === "door") {
      const door = doors[a.productIdx];
      cost += door?.costPerUnit ?? 0;
    } else {
      const win = windows[a.productIdx];
      cost += win?.costPerUnit ?? 0;
    }
  }

  return cost;
}

function evaluateUA(
  region: number,
  structureType: string,
  partAssignments: PartAssignment[],
  openingAssignments: OpeningAssignment[],
  foundation: OptFoundationInput,
  materials: MaterialOption[],
  windows: WindowOption[],
  doors: DoorOption[],
  foundationPsi: number
) {
  const partInputs = buildPartInputs(partAssignments, materials);
  const openingInputs = buildOpeningInputs(openingAssignments, windows, doors);

  const foundationInput: FoundationInput = {
    perimeterLength: foundation.perimeterLength,
    psiValue: foundationPsi,
    tempDiffCoeff: foundation.tempDiffCoeff,
    slabArea: foundation.slabArea,
  };

  const uaResult = calculateUA(region, structureType, partInputs, openingInputs, foundationInput);

  // Build eta inputs from UA results
  const etaPartInputs: EtaPartInput[] = uaResult.partDetails
    .filter((d) => d.orientation != null)
    .map((d) => ({
      partType: d.partType,
      orientation: d.orientation!,
      area: d.area,
      uValue: d.uValue,
      adjacentSpace: "external_air",
    }));

  const etaOpeningInputs = buildEtaOpeningInputs(openingAssignments, windows);

  const etaResult = calculateEta(region, etaPartInputs, etaOpeningInputs, uaResult.totalArea);

  return { uaResult, etaResult };
}

// ===== メイン最適化関数 =====

export function optimize(input: OptimizeInput): OptimizationOutput {
  const {
    region,
    structureType,
    targetGrade,
    parts,
    openings,
    foundation,
    materials,
    windows,
    doors,
  } = input;

  const targetUA = getTargetUA(targetGrade, region);
  const targetEtaAC = getTargetEtaAC(targetGrade, region);

  if (targetUA == null) {
    throw new Error(`No UA standard for grade=${targetGrade}, region=${region}`);
  }

  // --- 初期化: 各部位に最安の断熱材×最小厚さを割当 ---

  const partAssignments: PartAssignment[] = parts.map((p) => {
    const applicable = materials
      .map((m, i) => ({ m, i }))
      .filter((x) => x.m.applicableParts.includes(p.partType))
      .map((x) => x.i);

    if (applicable.length === 0) {
      return {
        partInput: p,
        materialIdx: 0,
        thicknessIdx: 0,
        applicableMaterials: [],
      };
    }

    // 最安の材料×最小厚さを選択
    let bestMatIdx = applicable[0];
    let bestCost = Infinity;
    for (const matIdx of applicable) {
      const mat = materials[matIdx];
      const minThickness = mat.availableThicknesses[0];
      const cost = (mat.costPerM2[minThickness] ?? 0) * p.area;
      if (cost < bestCost) {
        bestCost = cost;
        bestMatIdx = matIdx;
      }
    }

    return {
      partInput: p,
      materialIdx: bestMatIdx,
      thicknessIdx: 0,
      applicableMaterials: applicable,
    };
  });

  const openingAssignments: OpeningAssignment[] = openings.map((o) => {
    if (o.openingType === "door") {
      const applicable = doors.map((_, i) => i);
      let bestIdx = 0;
      let bestCost = Infinity;
      for (let i = 0; i < doors.length; i++) {
        if (doors[i].costPerUnit < bestCost) {
          bestCost = doors[i].costPerUnit;
          bestIdx = i;
        }
      }
      return {
        openingInput: o,
        productIdx: bestIdx,
        useShading: false,
        applicableProducts: applicable,
      };
    }

    const applicable = windows.map((_, i) => i);
    let bestIdx = 0;
    let bestCost = Infinity;
    for (let i = 0; i < windows.length; i++) {
      if (windows[i].costPerUnit < bestCost) {
        bestCost = windows[i].costPerUnit;
        bestIdx = i;
      }
    }
    return {
      openingInput: o,
      productIdx: bestIdx,
      useShading: false,
      applicableProducts: applicable,
    };
  });

  // 基礎psi値（初期は入力のまま）
  let foundationPsi = getFoundationPsi(
    foundation.position,
    foundation.length,
    foundation.slabEdge
  );

  // --- Phase 1: 貪欲法でUA基準を満たす ---

  const MAX_GREEDY_ITERATIONS = 100;

  for (let iter = 0; iter < MAX_GREEDY_ITERATIONS; iter++) {
    const { uaResult } = evaluateUA(
      region,
      structureType,
      partAssignments,
      openingAssignments,
      foundation,
      materials,
      windows,
      doors,
      foundationPsi
    );

    if (uaResult.ua <= targetUA) break;

    // コスト効率が最大のアップグレードを探索
    let bestCE = 0;
    let bestAction: (() => void) | null = null;

    // 部位のアップグレード候補
    for (let pi = 0; pi < partAssignments.length; pi++) {
      const a = partAssignments[pi];
      if (a.applicableMaterials.length === 0) continue;

      const mat = materials[a.materialIdx];
      const currentThickness = mat.availableThicknesses[a.thicknessIdx] ?? 0;
      const currentCost = (mat.costPerM2[currentThickness] ?? 0) * a.partInput.area;

      // 同じ材料で次の厚さ
      if (a.thicknessIdx < mat.availableThicknesses.length - 1) {
        const nextThicknessIdx = a.thicknessIdx + 1;
        const nextThickness = mat.availableThicknesses[nextThicknessIdx];
        const nextCost = (mat.costPerM2[nextThickness] ?? 0) * a.partInput.area;

        // UA変化を試算
        const saved = partAssignments[pi];
        partAssignments[pi] = { ...a, thicknessIdx: nextThicknessIdx };
        const { uaResult: trialResult } = evaluateUA(
          region, structureType, partAssignments, openingAssignments,
          foundation, materials, windows, doors, foundationPsi
        );
        partAssignments[pi] = saved;

        const deltaUA = uaResult.ua - trialResult.ua;
        const deltaCost = nextCost - currentCost;

        if (deltaUA > 0 && deltaCost >= 0) {
          const ce = deltaCost > 0 ? deltaUA / deltaCost : deltaUA * 1000;
          if (ce > bestCE) {
            bestCE = ce;
            const capturedPi = pi;
            const capturedIdx = nextThicknessIdx;
            bestAction = () => {
              partAssignments[capturedPi] = {
                ...partAssignments[capturedPi],
                thicknessIdx: capturedIdx,
              };
            };
          }
        }
      }

      // 別の材料への変更（より高性能なもの）
      for (const altMatIdx of a.applicableMaterials) {
        if (altMatIdx === a.materialIdx) continue;
        const altMat = materials[altMatIdx];

        for (let ti = 0; ti < altMat.availableThicknesses.length; ti++) {
          const altThickness = altMat.availableThicknesses[ti];
          const altCost = (altMat.costPerM2[altThickness] ?? 0) * a.partInput.area;

          const saved = partAssignments[pi];
          partAssignments[pi] = { ...a, materialIdx: altMatIdx, thicknessIdx: ti };
          const { uaResult: trialResult } = evaluateUA(
            region, structureType, partAssignments, openingAssignments,
            foundation, materials, windows, doors, foundationPsi
          );
          partAssignments[pi] = saved;

          const deltaUA = uaResult.ua - trialResult.ua;
          const deltaCost = altCost - currentCost;

          if (deltaUA > 0) {
            const ce = deltaCost > 0 ? deltaUA / deltaCost : deltaUA * 1000;
            if (ce > bestCE) {
              bestCE = ce;
              const capturedPi = pi;
              const capturedMatIdx = altMatIdx;
              const capturedThicknessIdx = ti;
              bestAction = () => {
                partAssignments[capturedPi] = {
                  ...partAssignments[capturedPi],
                  materialIdx: capturedMatIdx,
                  thicknessIdx: capturedThicknessIdx,
                };
              };
            }
          }
        }
      }
    }

    // 開口部のアップグレード候補
    for (let oi = 0; oi < openingAssignments.length; oi++) {
      const a = openingAssignments[oi];

      if (a.openingInput.openingType === "door") {
        for (const altIdx of a.applicableProducts) {
          if (altIdx === a.productIdx) continue;
          const currentDoor = doors[a.productIdx];
          const altDoor = doors[altIdx];
          if (!currentDoor || !altDoor) continue;

          const saved = openingAssignments[oi];
          openingAssignments[oi] = { ...a, productIdx: altIdx };
          const { uaResult: trialResult } = evaluateUA(
            region, structureType, partAssignments, openingAssignments,
            foundation, materials, windows, doors, foundationPsi
          );
          openingAssignments[oi] = saved;

          const deltaUA = uaResult.ua - trialResult.ua;
          const deltaCost = altDoor.costPerUnit - currentDoor.costPerUnit;

          if (deltaUA > 0) {
            const ce = deltaCost > 0 ? deltaUA / deltaCost : deltaUA * 1000;
            if (ce > bestCE) {
              bestCE = ce;
              const capturedOi = oi;
              const capturedIdx = altIdx;
              bestAction = () => {
                openingAssignments[capturedOi] = {
                  ...openingAssignments[capturedOi],
                  productIdx: capturedIdx,
                };
              };
            }
          }
        }
      } else {
        for (const altIdx of a.applicableProducts) {
          if (altIdx === a.productIdx) continue;
          const currentWin = windows[a.productIdx];
          const altWin = windows[altIdx];
          if (!currentWin || !altWin) continue;

          const saved = openingAssignments[oi];
          openingAssignments[oi] = { ...a, productIdx: altIdx };
          const { uaResult: trialResult } = evaluateUA(
            region, structureType, partAssignments, openingAssignments,
            foundation, materials, windows, doors, foundationPsi
          );
          openingAssignments[oi] = saved;

          const deltaUA = uaResult.ua - trialResult.ua;
          const deltaCost = altWin.costPerUnit - currentWin.costPerUnit;

          if (deltaUA > 0) {
            const ce = deltaCost > 0 ? deltaUA / deltaCost : deltaUA * 1000;
            if (ce > bestCE) {
              bestCE = ce;
              const capturedOi = oi;
              const capturedIdx = altIdx;
              bestAction = () => {
                openingAssignments[capturedOi] = {
                  ...openingAssignments[capturedOi],
                  productIdx: capturedIdx,
                };
              };
            }
          }
        }
      }
    }

    if (!bestAction) break; // これ以上アップグレードできない
    bestAction();
  }

  // --- etaAC対策: 南面の窓を日射遮蔽型に変更 ---
  if (targetEtaAC != null) {
    const southOrientations = ["S", "SW", "SE"];
    const allOrientations = ["S", "SW", "SE", "E", "W", "NE", "NW", "N"];

    for (const orientGroup of [southOrientations, allOrientations]) {
      const { etaResult } = evaluateUA(
        region, structureType, partAssignments, openingAssignments,
        foundation, materials, windows, doors, foundationPsi
      );

      if (etaResult.etaAC <= targetEtaAC) break;

      for (let oi = 0; oi < openingAssignments.length; oi++) {
        const a = openingAssignments[oi];
        if (a.openingInput.openingType !== "window") continue;
        if (!orientGroup.includes(a.openingInput.orientation)) continue;

        const win = windows[a.productIdx];
        if (win?.etaGShading != null && !a.useShading) {
          openingAssignments[oi] = { ...a, useShading: true };
        }
      }
    }
  }

  // --- Phase 2: 局所探索でコスト削減 ---
  const MAX_LOCAL_ITERATIONS = 50;

  for (let iter = 0; iter < MAX_LOCAL_ITERATIONS; iter++) {
    let improved = false;

    for (let pi = 0; pi < partAssignments.length; pi++) {
      const a = partAssignments[pi];
      if (a.thicknessIdx === 0) continue; // 既に最小

      // 1段階ダウン
      const downIdx = a.thicknessIdx - 1;
      const saved = partAssignments[pi];
      partAssignments[pi] = { ...a, thicknessIdx: downIdx };

      const { uaResult: afterDown, etaResult: etaAfterDown } = evaluateUA(
        region, structureType, partAssignments, openingAssignments,
        foundation, materials, windows, doors, foundationPsi
      );

      const uaOk = afterDown.ua <= targetUA;
      const etaOk = targetEtaAC == null || etaAfterDown.etaAC <= targetEtaAC;

      if (uaOk && etaOk) {
        // コスト削減成功、この変更を採用
        improved = true;
        continue; // 次の部位へ
      }

      // ダウンだけではNG -> 別の部位を1段階アップして補償できるか試す
      let compensated = false;
      for (let pj = 0; pj < partAssignments.length; pj++) {
        if (pj === pi) continue;
        const b = partAssignments[pj];
        const matB = materials[b.materialIdx];
        if (!matB || b.thicknessIdx >= matB.availableThicknesses.length - 1) continue;

        const savedB = partAssignments[pj];
        partAssignments[pj] = { ...b, thicknessIdx: b.thicknessIdx + 1 };

        const { uaResult: afterSwap, etaResult: etaAfterSwap } = evaluateUA(
          region, structureType, partAssignments, openingAssignments,
          foundation, materials, windows, doors, foundationPsi
        );

        const swapUaOk = afterSwap.ua <= targetUA;
        const swapEtaOk = targetEtaAC == null || etaAfterSwap.etaAC <= targetEtaAC;

        if (swapUaOk && swapEtaOk) {
          // コスト変化を確認
          const matA = materials[a.materialIdx];
          const oldThicknessA = matA.availableThicknesses[a.thicknessIdx];
          const newThicknessA = matA.availableThicknesses[downIdx];
          const costDeltaA =
            ((matA.costPerM2[newThicknessA] ?? 0) - (matA.costPerM2[oldThicknessA] ?? 0)) *
            a.partInput.area;

          const oldThicknessB = matB.availableThicknesses[b.thicknessIdx];
          const newThicknessB = matB.availableThicknesses[b.thicknessIdx + 1];
          const costDeltaB =
            ((matB.costPerM2[newThicknessB] ?? 0) - (matB.costPerM2[oldThicknessB] ?? 0)) *
            b.partInput.area;

          if (costDeltaA + costDeltaB < 0) {
            // コスト削減 -> 採用
            compensated = true;
            improved = true;
            break;
          }
        }

        // 元に戻す
        partAssignments[pj] = savedB;
      }

      if (!compensated) {
        // 全て元に戻す
        partAssignments[pi] = saved;
      }
    }

    if (!improved) break;
  }

  // --- 最終評価 ---
  const { uaResult: finalUA, etaResult: finalEta } = evaluateUA(
    region, structureType, partAssignments, openingAssignments,
    foundation, materials, windows, doors, foundationPsi
  );

  const totalCost = calculateTotalCost(
    partAssignments, openingAssignments, materials, windows, doors
  );

  const feasible =
    finalUA.ua <= targetUA &&
    (targetEtaAC == null || finalEta.etaAC <= targetEtaAC);

  // --- 結果構築 ---
  const partSpecs: PartSpec[] = partAssignments.map((a) => {
    const mat = materials[a.materialIdx];
    const thickness = mat ? mat.availableThicknesses[a.thicknessIdx] ?? 0 : 0;
    const unitCost = mat ? (mat.costPerM2[thickness] ?? 0) : 0;
    const detail = finalUA.partDetails.find(
      (d) =>
        d.partType === a.partInput.partType &&
        d.orientation === a.partInput.orientation &&
        d.area === a.partInput.area
    );

    return {
      partType: a.partInput.partType,
      orientation: a.partInput.orientation,
      area: a.partInput.area,
      materialId: mat?.id ?? "",
      materialName: mat?.name ?? "",
      thickness,
      uValue: detail?.uValue ?? 0,
      cost: unitCost * a.partInput.area,
    };
  });

  const openingSpecs: OpeningSpec[] = openingAssignments.map((a) => {
    if (a.openingInput.openingType === "door") {
      const door = doors[a.productIdx];
      return {
        orientation: a.openingInput.orientation,
        area: a.openingInput.area,
        openingType: "door",
        productId: door?.id ?? "",
        productName: door?.name ?? "",
        uValue: door?.udValue ?? 0,
        cost: door?.costPerUnit ?? 0,
      };
    }
    const win = windows[a.productIdx];
    const etaG =
      a.useShading && win?.etaGShading != null ? win.etaGShading : (win?.etaG ?? 0);
    return {
      orientation: a.openingInput.orientation,
      area: a.openingInput.area,
      openingType: "window",
      productId: win?.id ?? "",
      productName: win?.name ?? "",
      uValue: win?.uwValue ?? 0,
      etaG,
      cost: win?.costPerUnit ?? 0,
    };
  });

  const foundationSpec: FoundationSpec = {
    perimeterLength: foundation.perimeterLength,
    psiValue: foundationPsi,
    cost: 0, // 基礎断熱コストは別途計算が必要
  };

  return {
    achievedUA: finalUA.ua,
    achievedEtaAC: finalEta.etaAC,
    achievedEtaAH: finalEta.etaAH,
    totalCost,
    targetUA,
    targetEtaAC,
    specs: {
      parts: partSpecs,
      openings: openingSpecs,
      foundation: foundationSpec,
    },
    feasible,
  };
}
