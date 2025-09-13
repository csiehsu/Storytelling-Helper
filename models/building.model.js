// 紀錄特定的建築物 instance
import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema({
  buildingId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  locationId: { type: String, required: true },
  ownerId: { type: String },
  permanent: { type: Boolean, default: false },
  state: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Building = mongoose.model("Building", buildingSchema);

export default Building;
