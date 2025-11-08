import mongoose from "mongoose";
import { SmellTypes } from "../constants/schemaEnums.js";

// 定義單個氣味物件的結構
const smellSchema = new mongoose.Schema(
  {
    type: { type: String, enum: SmellTypes, default: "none" },
    level: { type: Number, default: 0, min: 0, max: 5 },
  },
  { _id: false }
);

export default smellSchema;
