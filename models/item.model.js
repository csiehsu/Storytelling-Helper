import mongoose from "mongoose";

// 定義 attributes 的子模式
const combatAttributesSchema = new mongoose.Schema(
  {
    attackType: { type: String },
    attack: { type: Number },
    defense: { type: Number },
  },
  { _id: false }
);

// 定義 nutrition 的子模式
const nutritionSchema = new mongoose.Schema(
  {
    strength: { type: Number },
    speed: { type: Number },
    dexterity: { type: Number },
    spiritual: { type: Number },
    hp: { type: Number },
    mp: { type: Number },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String },
  imageUrl: { type: String },
  type: { type: String, required: true },
  durability: { type: Number, default: -1 },
  weight: { type: Number, default: 0 },
  combatAttributes: { type: combatAttributesSchema },
  nutrition: { type: nutritionSchema },
});

const Item = mongoose.model("Item", itemSchema);

export default Item;
