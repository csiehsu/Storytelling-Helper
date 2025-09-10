import mongoose from "mongoose";

// 1. 定義 attributes 的子模式
const attributesSchema = new mongoose.Schema(
  {
    attack: { type: Number },
    defense: { type: Number },
    weight: { type: Number },
    durability: { type: Number },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: { type: String },
  imageUrl: { type: String },
  type: { type: String, required: true },
  attributes: { type: attributesSchema }, // 這裡使用了子模式
});

const Item = mongoose.model("Item", itemSchema);

export default Item;
