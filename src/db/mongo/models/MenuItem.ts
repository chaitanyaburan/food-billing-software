import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ModifierSchema = new Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, required: true }
  },
  { _id: false }
);

const MenuItemSchema = new Schema(
  {
    restaurantId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    isVeg: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: true, index: true },
    modifiers: { type: [ModifierSchema], default: [] }
  },
  { timestamps: true }
);

MenuItemSchema.index({ restaurantId: 1, name: 1 }, { unique: false });

export type MenuItem = InferSchemaType<typeof MenuItemSchema>;

export const MenuItemModel =
  (mongoose.models.MenuItem as mongoose.Model<MenuItem>) ||
  mongoose.model<MenuItem>("MenuItem", MenuItemSchema);
