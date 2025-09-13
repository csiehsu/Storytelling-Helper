// 紀錄通用的建築物類型
import mongoose from "mongoose";

const requiredItemSchema = new mongoose.Schema(
  {
    itemId: { type: String },
    itemType: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const buildingTypeSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  requiredItems: { type: [requiredItemSchema], default: [] },
  imageUrl: { type: String },
});

const BuildingType = mongoose.model("BuildingType", buildingTypeSchema);

export default BuildingType;
