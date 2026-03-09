import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 2,
  operator: 1,
};

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new AuthError("認証が必要です", 401);
  }
  return session;
}

export async function requireRole(minimumRole: string) {
  const session = await requireAuth();
  const userRoleLevel = ROLE_HIERARCHY[session.user.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  if (userRoleLevel < requiredLevel) {
    throw new AuthError("権限がありません", 403);
  }
  return session;
}
