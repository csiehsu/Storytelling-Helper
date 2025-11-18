import mongoose from "mongoose";
import { Schema } from "mongoose";
import GAME_CONFIG from "../config/gameConfig.js";

// 定義 stats 的子模式 (schema)
const statsSchema = new mongoose.Schema(
  {
    maxHp: { type: Number, default: 100 },
    strength: { type: Number, required: true },
    speed: { type: Number, required: true },
    dexterity: { type: Number, required: true },
    spiritual: { type: Number, default: 10 },
  },
  { _id: false }
); // 這裡設定 _id: false 是因為 stats 只是 user 模式的一個子文件，不需要自己的 _id

// 在 statsSchema 中定義虛擬屬性
statsSchema.virtual("maxMp").get(function () {
  return this.spiritual * 10;
});

// 輸出 JSON 包含虛擬屬性
statsSchema.set("toJSON", { virtuals: true });
statsSchema.set("toObject", { virtuals: true });

// 定義 equipped 裝備的子模式
const equippedSchema = new mongoose.Schema(
  {
    // 引用 Item 模型的 _id
    weapon: { type: Schema.Types.ObjectId, ref: "Item" },
    headArmor: { type: Schema.Types.ObjectId, ref: "Item" },
    bodyArmor: { type: Schema.Types.ObjectId, ref: "Item" },
    legArmor: { type: Schema.Types.ObjectId, ref: "Item" },
    footArmor: { type: Schema.Types.ObjectId, ref: "Item" },
    handArmor: { type: Schema.Types.ObjectId, ref: "Item" },
    accessory: { type: Schema.Types.ObjectId, ref: "Item" },
  },
  { _id: false }
);

equippedSchema.virtual("defense").get(function () {
  // 根據裝備計算防禦力
});

equippedSchema.set("toJSON", { virtuals: true });
equippedSchema.set("toObject", { virtuals: true });

// 定義 crafting 製作的子模式
const skillsSchema = new mongoose.Schema(
  {
    skillId: {
      type: String,
      required: true,
      unique: true, // 確保每個技能名稱都是唯一的
    },
    level: {
      type: Number,
      default: 1,
    },
    exp: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// --- 主模式：userSchema ---
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true, // 確保每個 Discord 使用者的 ID 都是唯一的
  },
  characterName: {
    type: String,
    required: true,
    unique: true,
    default: "異鄉人",
  },
  gold: {
    type: Number,
    default: 0,
  },
  stamina: { type: Number, default: GAME_CONFIG.BASE_MAX_STAMINA },
  currentHp: { type: Number, default: 100 },
  currentMp: { type: Number, default: 100 },
  stats: {
    type: statsSchema,
    default: () => ({}), // 設定預設值以避免創建時出錯
  },
  equipped: {
    type: equippedSchema,
    default: () => ({}),
  },
  skills: [skillsSchema],
  learnedRecipes: {
    type: [String], // 儲存 recipeId 的陣列
    default: [],
  },
  // 玩家當前的位置 ID
  locationId: {
    type: String,
    default: "PIONEER_CABIN",
    ref: "Location", // 引用 Location Model
  },

  // *** 關鍵改變：Known Locations (已知地點) ***
  knownLocations: {
    type: [String], // 儲存玩家已經探索過的地點的 _id/slug
    default: ["PIONEER_CABIN", "VERDANT_BAY_PORT"],
  },

  currentMove: {
    isMoving: { type: Boolean, default: false }, // 是否正在移動中
    fullPath: { type: [String], default: [] }, // 完整的路徑 ID 陣列 (e.g., ['A', 'B', 'C', 'D'])
    currentIndex: { type: Number, default: 0 }, // 當前已走到路徑中的第幾個節點索引 (0-based)
    destinationId: { type: String, nullable: true }, // 最終目的地 ID
    totalCost: { type: Number, default: 0 }, // 該旅程的總體力消耗
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 建立並匯出模型
const User = mongoose.model("User", userSchema);

export default User;
