import { z } from "zod";

const windowItemSchema = z.object({
  name: z.string().max(100),
  windowType: z.string().max(100),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  area: z.number().nonnegative(),
});

export const updateElevationSchema = z.object({
  widthN: z.number().nonnegative().nullable().optional(),
  widthE: z.number().nonnegative().nullable().optional(),
  widthS: z.number().nonnegative().nullable().optional(),
  widthW: z.number().nonnegative().nullable().optional(),
  maxHeight: z.number().nonnegative().nullable().optional(),
  eaveHeight: z.number().nonnegative().nullable().optional(),
  firstFloorToEave: z.number().nonnegative().nullable().optional(),
  windowsN: z.array(windowItemSchema).default([]),
  windowsE: z.array(windowItemSchema).default([]),
  windowsS: z.array(windowItemSchema).default([]),
  windowsW: z.array(windowItemSchema).default([]),
});

export type WindowItem = z.infer<typeof windowItemSchema>;
export type ElevationInput = z.infer<typeof updateElevationSchema>;
