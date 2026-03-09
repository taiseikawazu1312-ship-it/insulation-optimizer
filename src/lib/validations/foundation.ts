import { z } from "zod";

export const updateFoundationSchema = z.object({
  foundationType: z.enum(["spread", "slab"]).default("slab"),
  perimeterLength: z.number().positive("外周長は正の値を入力してください"),
  slabArea: z.number().nonnegative().optional().nullable(),
  slabEdgePosition: z.enum(["above_gl", "below_gl"]).default("above_gl"),
  insulationPosition: z.enum(["external", "internal", "none"]).default("none"),
  insulationLength: z.enum(["0.4", "0.6", "full", "none"]).default("none"),
  insulationMaterialId: z.string().optional().nullable(),
});
