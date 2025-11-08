import mongoose from "mongoose";
import smellSchema from "./smell.model.js";

const statsSchema = new mongoose.Schema(
  {
    maxHp: { type: Number, required: true },
    maxMp: { type: Number, required: true },
    strength: { type: Number, required: true },
    speed: { type: Number, required: true },
    dexterity: { type: Number, required: true },
    spiritual: { type: Number, required: true },
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
    enum: ["NPC", "MONSTER"],
    required: true,
  },

  stats: { type: statsSchema, required: true },
  equipped: { type: equippedSchema, default: () => ({}) },
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

  smells: {
    type: [smellSchema],
    default: [{ type: "NONE", level: 0 }],
  },

  likes: { type: tasteSchema, default: () => ({}) },
  dislikes: { type: tasteSchema, default: () => ({}) },
});

const NPC = mongoose.model("NPC", npcSchema);

export default NPC;
