import { PubSub } from "@/lib/realtime/pubsub";

export type KdsEvent =
  | { type: "ORDER_CREATED"; restaurantId: string; orderId: string }
  | { type: "ORDER_UPDATED"; restaurantId: string; orderId: string; status: string };

const globalForBus = globalThis as unknown as { kdsBus?: PubSub<KdsEvent> };

export const kdsBus = globalForBus.kdsBus ?? new PubSub<KdsEvent>();

if (process.env.NODE_ENV !== "production") globalForBus.kdsBus = kdsBus;
