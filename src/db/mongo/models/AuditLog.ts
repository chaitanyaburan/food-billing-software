import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AuditLogSchema = new Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    userId: { type: String },
    action: { type: String, required: true, index: true },
    entityType: { type: String },
    entityId: { type: String },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

AuditLogSchema.index({ restaurantId: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof AuditLogSchema>;

export const AuditLogModel =
  (mongoose.models.AuditLog as mongoose.Model<AuditLog>) ||
  mongoose.model<AuditLog>("AuditLog", AuditLogSchema);
