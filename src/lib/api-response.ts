import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "./auth-helpers";

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

export function paginatedResponse<T>(
  items: T[],
  pagination: { page: number; limit: number; total: number }
) {
  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return errorResponse(error.message, "AUTH_ERROR", error.statusCode);
  }

  if (error instanceof z.ZodError) {
    const messages = error.issues.map((issue) => issue.message).join(", ");
    return errorResponse(messages, "VALIDATION_ERROR", 400);
  }

  if (error instanceof Error) {
    console.error("Unexpected error:", error);
    return errorResponse(error.message, "INTERNAL_ERROR", 500);
  }

  return errorResponse("不明なエラーが発生しました", "UNKNOWN_ERROR", 500);
}
