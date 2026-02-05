import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtUserClaims } from "@/lib/auth/jwt";

export type AuthContext = {
  user: JwtUserClaims;
};

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const [, token] = header.split(" ");

  if (token) return token;

  try {
    const url = new URL(req.url);
    const qp = url.searchParams.get("token");
    return qp || null;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): AuthContext {
  const token = getBearerToken(req);
  if (!token) throw new Error("UNAUTHENTICATED");
  const user = verifyAccessToken(token);
  return { user };
}

export function requireRole(ctx: AuthContext, allowed: AuthContext["user"]["role"][]) {
  if (!allowed.includes(ctx.user.role)) throw new Error("FORBIDDEN");
}
