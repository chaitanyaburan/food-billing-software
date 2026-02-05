import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { env } from "@/lib/env";
import { ok, fail } from "@/lib/http/response";
import { HttpError } from "@/lib/http/errors";

const bodySchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ email: body.identifier }, { phone: body.identifier }]
      }
    });

    if (!user) throw new HttpError(401, "INVALID_CREDENTIALS");

    const okPw = await verifyPassword(body.password, user.passwordHash);
    if (!okPw) throw new HttpError(401, "INVALID_CREDENTIALS");

    const claims = {
      sub: user.id,
      restaurantId: user.restaurantId,
      role: user.role
    } as const;

    const accessToken = signAccessToken(claims);
    const refreshToken = signRefreshToken(claims);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000)
      }
    });

    return ok({ accessToken, refreshToken, role: user.role, restaurantId: user.restaurantId });
  } catch (err) {
    return fail(err);
  }
}
