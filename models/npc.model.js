import mongoose from "mongoose";
import { SmellTypes } from "../constants/schemaEnums.js";

const statsSchema = new mongoose.Schema(
  {
    maxHp: { type: Number, required: true },
    strength: { type: Number, required: true },
    speed: { type: Number, required: true },
    dexterity: { type: Number, required: true },
    spiritual: { type: Number, default: 0 },
    defense: { type: Number, required: true },
  },
  { _id: false }
);

// 定義 equipped 裝備的子模式
const equippedSchema = new mongoose.Schema(
  {
    // Item 模型的 id
    weaponId: { type: String },
    headArmorId: { type: String },
    bodyArmorId: { type: String },
    legArmorId: { type: String },
    footArmorId: { type: String },
    handArmorId: { type: String },
    accessoryId: { type: String },
  },
  { _id: false }
);

equippedSchema.set("toJSON", { virtuals: true });
equippedSchema.set("toObject", { virtuals: true });

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

const smellSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: SmellTypes,
      required: true,
    },

    level: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
  },
  { _id: false }
);

const tasteSchema = new mongoose.Schema(
  {
    smells: { type: [smellSchema], default: [] },
    items: {
      type: [String], //itemId 陣列
      default: [],
    },
  },
  { _id: false }
);

const npcSchema = new mongoose.Schema({
  // 基礎資訊
  npcId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  imageUrl: {
    type: String,
    required: true,
  },

  // 角色類型與狀態
  type: {
    type: String,
    enum: ["NPC", "野獸"],
    required: true,
  },
  status: {
    type: String, // 戰鬥狀態或非戰鬥狀態
    enum: ["idle", "hostile", "friendly", "dead"],
    default: "idle",
  },

  hp: { type: Number, required: true },
  stats: { type: statsSchema, required: true },
  equipped: { type: equippedSchema },
  skills: [skillsSchema],

  drops: [
    {
      itemId: {
        type: String,
        required: true,
      },
      dropRate: {
        type: Number,
        required: true,
      },
    },
  ],

  likes: { type: tasteSchema, default: () => ({}) },
  dislikes: { type: tasteSchema, default: () => ({}) },
});

const NPC = mongoose.model("NPC", npcSchema);

export default NPC;
