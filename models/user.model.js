import mongoose from "mongoose";
import { Schema } from "mongoose";

// 定義 stats 的子模式 (schema)
const statsSchema = new mongoose.Schema(
  {
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
const skillSchema = new mongoose.Schema(
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
  maxHp: { type: Number, default: 100 },
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
  skill: [skillSchema],
  learnedRecipes: {
    type: [String], // 儲存 recipeId 的陣列
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 建立並匯出模型
const User = mongoose.model("User", userSchema);

export default User;
