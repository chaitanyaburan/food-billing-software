import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { env } from "@/lib/env";
import { ok, fail } from "@/lib/http/response";
import { HttpError } from "@/lib/http/errors";

const bodySchema = z.object({
  refreshToken: z.string().min(10)
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());

    // Verify refresh token
    let claims;
    try {
      claims = verifyRefreshToken(body.refreshToken);
    } catch {
      throw new HttpError(401, "INVALID_REFRESH_TOKEN");
    }

    // Check if session exists and is valid
    const session = await prisma.userSession.findFirst({
      where: {
        refreshToken: body.refreshToken,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      throw new HttpError(401, "SESSION_EXPIRED");
    }

    // Get user to verify they're still active
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user || !user.isActive) {
      throw new HttpError(401, "USER_INACTIVE");
    }

    // Generate new tokens
    const newClaims = {
      sub: user.id,
      restaurantId: user.restaurantId,
      role: user.role
    } as const;

    const newAccessToken = signAccessToken(newClaims);
    const newRefreshToken = signRefreshToken(newClaims);

    // Update session with new refresh token
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000)
      }
    });

    return ok({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      role: user.role,
      restaurantId: user.restaurantId
    });
  } catch (err) {
    return fail(err);
  }
}
