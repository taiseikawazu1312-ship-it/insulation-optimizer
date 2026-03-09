import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "プロジェクト名は必須です").max(200),
  region: z.number().int().min(1).max(8),
  targetGrade: z.enum(["grade4", "grade5", "ZEH", "G1", "G2", "G3"]),
  structureType: z.enum(["timber_frame", "platform_frame"]),
  totalFloorArea: z.number().positive("延床面積は正の値を入力してください"),
  stories: z.number().int().min(1).max(4).default(2),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  region: z.number().int().min(1).max(8).optional(),
  targetGrade: z.enum(["grade4", "grade5", "ZEH", "G1", "G2", "G3"]).optional(),
  structureType: z.enum(["timber_frame", "platform_frame"]).optional(),
  totalFloorArea: z.number().positive().optional(),
  stories: z.number().int().min(1).max(4).optional(),
  status: z.enum(["draft", "calculated", "optimized"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "calculated", "optimized"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
