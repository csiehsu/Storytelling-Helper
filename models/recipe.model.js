// 定義製作一個配方會產出什麼
import mongoose from "mongoose";
import { Schema } from "mongoose";

const recipeSchema = new Schema({
  // outputItem 的 type 是 ObjectId，這會連結到 Item 模型的 _id
  outputItem: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  outputQuantity: { type: Number, required: true },

  // materials 是陣列，表示一個配方可以有多個素材。只要符合 type 類型的道具都可以是素材
  materials: [
    {
      type: { type: String, required: true },
      quantity: { type: Number, required: true },
    },
  ],

  // tools 也是陣列，表示一個配方可以有多個工具。只要符合 type 類型的道具都可以是工具
  tools: [
    {
      type: { type: String, required: true },
    },
  ],
});

// 建立並匯出模型
const Recipe = mongoose.model("Recipe", recipeSchema);

export default Recipe;
