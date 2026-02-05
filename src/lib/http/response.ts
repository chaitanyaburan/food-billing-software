import { NextResponse } from "next/server";
import { asHttpError } from "@/lib/http/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(err: unknown) {
  const http = asHttpError(err);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: http.code,
        message: http.message,
        details: (http as any).details
      }
    },
    { status: http.status }
  );
}
