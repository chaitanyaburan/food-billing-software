import mongoose, { Schema, type InferSchemaType } from "mongoose";

export type OrderStatus = "PLACED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

const OrderItemSchema = new Schema(
  {
    menuItemId: { type: String, required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true },
    qty: { type: Number, required: true },
    modifiers: {
      type: [{ name: { type: String, required: true }, priceDelta: { type: Number, required: true } }],
      default: []
    },
    notes: { type: String }
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    createdByUserId: { type: String, required: true },

    type: { type: String, enum: ["DINE_IN", "TAKEAWAY", "DELIVERY"], required: true },
    tableNo: { type: String },

    status: {
      type: String,
      enum: ["PLACED", "PREPARING", "READY", "COMPLETED", "CANCELLED"],
      default: "PLACED",
      index: true
    },

    items: { type: [OrderItemSchema], required: true },

    customerName: { type: String },
    customerPhone: { type: String },
    deliveryAddress: { type: String },

    linkedInvoiceId: { type: String }
  },
  { timestamps: true }
);

OrderSchema.index({ restaurantId: 1, createdAt: -1 });

export type Order = InferSchemaType<typeof OrderSchema>;

export const OrderModel =
  (mongoose.models.Order as mongoose.Model<Order>) ||
  mongoose.model<Order>("Order", OrderSchema);
