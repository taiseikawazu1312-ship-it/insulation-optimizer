import { z } from "zod";

export const createOpeningSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  orientation: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
  width: z.number().positive("幅は正の値を入力してください"),
  height: z.number().positive("高さは正の値を入力してください"),
  openingType: z.enum(["window", "door"]),
  windowProductId: z.string().optional().nullable(),
  doorProductId: z.string().optional().nullable(),
  attachment: z.enum(["none", "shutter", "shoji"]).default("none"),
  hasSunshade: z.boolean().default(false),
});

export const updateOpeningSchema = createOpeningSchema.partial();
