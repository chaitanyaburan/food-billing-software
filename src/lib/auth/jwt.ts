import jwt from "jsonwebtoken";
import { env } from "@/lib/env";

export type JwtUserClaims = {
  sub: string;
  restaurantId: string;
  role: "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN";
};

export function signAccessToken(claims: JwtUserClaims) {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL_SECONDS
  });
}

export function signRefreshToken(claims: JwtUserClaims) {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL_SECONDS
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserClaims;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserClaims;
}
