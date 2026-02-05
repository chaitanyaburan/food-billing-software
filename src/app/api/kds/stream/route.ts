import { NextRequest } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/rbac";
import { kdsBus, type KdsEvent } from "@/lib/realtime/kdsBus";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ctx = requireAuth(req);
  requireRole(ctx, ["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: KdsEvent) => {
        if (event.restaurantId !== ctx.user.restaurantId) return;
        controller.enqueue(encoder.encode(`event: ${event.type}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      controller.enqueue(encoder.encode("event: HELLO\n"));
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "HELLO", restaurantId: ctx.user.restaurantId })}\n\n`
        )
      );

      const unsubscribe = kdsBus.subscribe(send);

      const interval = setInterval(() => {
        controller.enqueue(encoder.encode("event: PING\n"));
        controller.enqueue(encoder.encode(`data: ${Date.now()}\n\n`));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
