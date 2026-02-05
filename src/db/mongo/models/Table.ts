import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TableSchema = new Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    tableNo: { type: String, required: true },
    capacity: { type: Number, default: 4 },
    isEnabled: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

TableSchema.index({ restaurantId: 1, tableNo: 1 }, { unique: true });

export type Table = InferSchemaType<typeof TableSchema>;

export const TableModel =
  (mongoose.models.Table as mongoose.Model<Table>) ||
  mongoose.model<Table>("Table", TableSchema);
