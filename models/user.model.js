import mongoose from "mongoose";

// 定義 stats 的子模式 (schema)
const statsSchema = new mongoose.Schema(
  {
    strength: { type: Number, default: 10 },
    dexterity: { type: Number, default: 10 },
    hp: { type: Number, default: 100 },
    mp: { type: Number, default: 50 },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
  },
  { _id: false }
); // 這裡設定 _id: false 是因為 stats 只是 user 模式的一個子文件，不需要自己的 _id

// 定義 inventory 道具的子模式
const inventorySchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

// 定義 equipped 裝備的子模式
const equippedSchema = new mongoose.Schema(
  {
    weapon: { type: String },
    headArmor: { type: String },
    bodyArmor: { type: String },
    legArmor: { type: String },
    footArmor: { type: String },
    handArmor: { type: String },
    accessory: { type: String },
  },
  { _id: false }
);

// 定義 crafting 製作的子模式
const craftingSkillSchema = new mongoose.Schema(
  {
    skillName: {
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

// 定義 crafting 配方的子模式
const craftingRecipeSchema = new mongoose.Schema(
  {
    recipeId: { type: String, required: true },
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
  stats: {
    type: statsSchema,
    default: () => ({}), // 設定預設值以避免創建時出錯
  },
  inventory: [inventorySchema], // 陣列，包含多個 inventorySchema 文件
  equipped: {
    type: equippedSchema,
    default: () => ({}),
  },
  craftingSkill: [craftingSkillSchema],
  craftingRecipe: [craftingRecipeSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 建立並匯出模型
const User = mongoose.model("User", userSchema);

export default User;
