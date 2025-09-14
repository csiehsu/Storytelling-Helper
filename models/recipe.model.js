// 定義製作一個配方會產出什麼
import mongoose from "mongoose";

// 用來定義材料的子 Schema
const requiredItemSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const outputItemSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const nameSchema = new mongoose.Schema(
  {
    ch: { type: String, required: true },
    en: { type: String, required: true },
  },
  { _id: false }
);
const recipeSchema = new mongoose.Schema({
  recipeId: { type: String, required: true, unique: true },
  name: { type: nameSchema, required: true },
  outputItems: { type: [outputItemSchema], required: true },
  requiredItems: { type: [requiredItemSchema], default: [] },
  requiredToolTypes: { type: [String], default: [] },
});

const Recipe = mongoose.model("Recipe", recipeSchema);

export default Recipe;
