import { z } from "zod";

const envelopePartSchema = z.object({
  id: z.string().optional(),
  partType: z.enum(["ceiling", "roof", "wall", "floor", "foundation_wall", "slab"]),
  orientation: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "top"]).optional().nullable(),
  area: z.number().nonnegative("面積は0以上を入力してください"),
  adjacentSpace: z.enum([
    "external_air", "attic_ventilated", "underfloor_ventilated",
    "garage", "attic_unventilated", "adjacent_unit",
  ]).default("external_air"),
  insulationMaterialId: z.string().optional().nullable(),
  insulationThickness: z.number().positive().optional().nullable(),
  additionalInsulationId: z.string().optional().nullable(),
  additionalThickness: z.number().positive().optional().nullable(),
});

export const updateEnvelopeSchema = z.object({
  parts: z.array(envelopePartSchema).min(1, "少なくとも1つの部位を入力してください"),
});

export type EnvelopePartInput = z.infer<typeof envelopePartSchema>;
