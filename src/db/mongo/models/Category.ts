import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

CategorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export type Category = InferSchemaType<typeof CategorySchema>;

export const CategoryModel =
  (mongoose.models.Category as mongoose.Model<Category>) ||
  mongoose.model<Category>("Category", CategorySchema);
