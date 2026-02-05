export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asHttpError(err: unknown) {
  if (err instanceof HttpError) return err;

  // Zod validation
  if (isZodError(err)) {
    const issues = (err as any).issues;
    return new HttpError(400, "VALIDATION_ERROR", "Invalid request body", issues);
  }

  // Prisma
  const prisma = asPrismaError(err);
  if (prisma) return prisma;

  if (err instanceof Error) {
    if (err.message === "UNAUTHENTICATED") return new HttpError(401, "UNAUTHENTICATED");
    if (err.message === "FORBIDDEN") return new HttpError(403, "FORBIDDEN");

    // Preserve original message so 500s are actionable in dev.
    return new HttpError(500, "INTERNAL_ERROR", err.message);
  }
  return new HttpError(500, "INTERNAL_ERROR", "Unknown error");
}

function isZodError(err: unknown): err is { name: string; message: string } {
  return typeof err === "object" && err !== null && (err as any).name === "ZodError";
}

function asPrismaError(err: unknown): HttpError | null {
  if (typeof err !== "object" || err === null) return null;

  const e: any = err;

  // PrismaClientKnownRequestError
  if (e.code && typeof e.code === "string") {
    if (e.code === "P2002") return new HttpError(409, "CONFLICT", "Unique constraint violation");
    if (e.code === "P2021") return new HttpError(500, "DB_SCHEMA_MISSING", "Database tables not found. Run migrations.");
    if (e.code === "P2022") return new HttpError(500, "DB_COLUMN_MISSING", "Database column not found. Run migrations.");
  }

  // PrismaClientInitializationError / connection errors
  if (e.name === "PrismaClientInitializationError") {
    return new HttpError(500, "DB_INIT_ERROR", e.message);
  }

  return null;
}
