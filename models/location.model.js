import mongoose from "mongoose";

const gatherableItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true }, // 物品的 ID
    chance: { type: Number, required: true }, // 採集到這個物品的初始機率（1-100）
  },
  { _id: false }
);

const adjacencySchema = new mongoose.Schema(
  {
    // 連接到的目標地點 ID (slug)
    targetLocationId: { type: String, required: true },

    // 從當前地點移動到目標地點所需的體力消耗（權重）
    staminaCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const eventInfoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    forced: { type: Boolean, required: true },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true }, // 綁定到 Discord 的頻道 ID
  locationId: { type: String, required: true, unique: true }, // 地點的唯一標識符 (slug)
  name: { type: String, required: true },
  description: { type: String },
  gatherables: {
    type: [gatherableItemSchema],
    default: [],
  },

  // 儲存所有直接相連的地點及其消耗
  connections: {
    type: [adjacencySchema],
    default: [],
  },

  hasEvent: {
    type: Boolean,
    default: false,
    required: true,
  },

  eventInfo: { type: eventInfoSchema },
});

const Location = mongoose.model("Location", locationSchema);

export default Location;
