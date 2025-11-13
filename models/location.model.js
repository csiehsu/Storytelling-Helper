import mongoose from "mongoose";

const gatherableItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true }, // 物品的 ID
    chance: { type: Number, required: true }, // 採集到這個物品的初始機率（1-100）
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true }, // 綁定到 Discord 的頻道 ID
  locationId: { type: String, required: true, unique: true }, // 地點的唯一標識符
  name: { type: String, required: true },
  description: { type: String },
  gatherables: {
    type: [gatherableItemSchema],
    default: [],
  },
});

const Location = mongoose.model("Location", locationSchema);

export default Location;
