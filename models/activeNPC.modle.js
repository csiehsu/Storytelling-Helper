import mongoose from "mongoose";
import smellSchema from "./smell.model.js";
import NPC from "./npc.model.js";

const statsSchema = new mongoose.Schema(
  {
    maxHp: { type: Number, required: true },
    maxMp: { type: Number, required: true },
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
    currentCD: {
      type: Number,
      default: 0,
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

const feelingSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["NPC", "Player"],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    affection: {
      type: Number,
      default: 0,
      min: -100,
      max: 100,
    },
  },
  { _id: false }
);

const activeNPCSchema = new mongoose.Schema(
  {
    // 靜態模板 ID (引用基礎 NPC 數據)
    templateId: {
      type: String,
      required: true,
      ref: "NPC", // 讀取時會自動參照 NPC Collection，單體讀取速度慢但使用方便，適用於該屬性常常被使用的情況
    },

    // === 位置追蹤 (World State) ===
    // 當前所在的 Discord 頻道/地圖 ID
    locationId: {
      type: String,
      required: true,
      index: true, // 增加索引以加速查詢 (例如：查詢頻道內所有 NPC)，適用於大量 NPC 且頻繁查詢的情況
    },

    // 一般資訊
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    imageUrl: {
      type: String,
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
    feelings: { type: [feelingSchema], default: [] },

    // === 戰鬥狀態 (Runtime State) ===
    currentHp: {
      type: Number,
      required: true,
      min: 0,
    },
    currentMp: {
      type: Number,
      required: true,
      min: 0,
    },
    actionState: {
      type: String,
      enum: ["IDLE", "AGGRESSIVE", "DEFENSIVE", "WORKING", "SLEEPING"],
      default: "IDLE",
    },
    // 正在戰鬥的玩家 ID
    engagedBy: {
      type: [String],
      default: null,
    },
  },
  {
    // 自動添加 createdAt 和 updatedAt 欄位
    timestamps: true,
  }
);

// ====================================================================
// 實例方法 (Method) 範例
// ====================================================================

// 範例：發布一個靜態方法，用於根據位置查找所有非戰鬥中的 NPC
activeNPCSchema.statics.findAvailable = async function (locationId) {
  return this.find({
    locationId: locationId,
    currentHp: { $gt: 0 }, // HP 大於 0
  });
};

/**
 * 根據模板 ID 創建一個全新的 ActiveNPC 實例
 * @param {string} templateId - 基礎 NPC 模板的 ID (例如 'GOBLIN_GUARD')
 * @param {string} locationId - NPC 誕生的頻道/地圖 ID
 * @param {string} actionState - NPC 的初始行動狀態
 * @returns {ActiveNPCDocument} - 新創建的活躍 NPC 實例
 */
activeNPCSchema.statics.createInstance = async function (
  templateId,
  locationId,
  actionState = "IDLE"
) {
  // 1. 查詢 NPC 模板數據
  const templateData = await NPC.findOne({ npcId: templateId }).lean();

  if (!templateData) {
    throw new Error(`找不到 ID 為 ${templateId} 的 NPC 模板。`);
  }

  // 2. 處理技能：複製基礎技能清單，並加上運行時屬性 (例如 currentCD)
  const instanceStats = { ...templateData.stats };
  const instanceSkills = templateData.skills.map((skillId) => ({
    skillId: skillId,
    level: level,
    exp: 0,
    currentCD: 0,
  }));

  const instanceEquipped = { ...templateData.equipped };
  const instanceDrops = templateData.drops.map((drop) => ({ ...drop }));
  const instanceSmells = templateData.smells.map((smell) => ({ ...smell }));
  const instanceLikes = {
    smells: templateData.likes.smells.map((smell) => ({ ...smell })),
    items: [...templateData.likes.items],
  };
  const instanceDislikes = {
    smells: templateData.dislikes.smells.map((smell) => ({ ...smell })),
    items: [...templateData.dislikes.items],
  };

  // 3. 創建 ActiveNPC 文件
  const newInstance = new this({
    // this 指向 ActiveNPC Model
    // 核心識別
    templateId: templateId,
    locationId: locationId,
    actionState: actionState,

    // 靜態數值複製 (Snapshot)
    name: templateData.name,
    description: templateData.description,
    imageUrl: templateData.imageUrl,
    type: templateData.type,

    // 複雜結構複製與擴展
    stats: instanceStats,
    skills: instanceSkills,
    equipped: instanceEquipped,
    drops: instanceDrops,
    smells: instanceSmells,
    likes: instanceLikes,
    dislikes: instanceDislikes,

    // 預設動態屬性
    currentHp: templateData.stats.maxHp, // 複製並設為當前 HP
    currentMp: templateData.stats.maxMp, // 複製並設為當前 MP
    feelings: [],
    isEngaged: false,
    lastActivity: new Date(),
  });

  // 4. 儲存並返回新實例
  await newInstance.save();
  return newInstance;
};

const ActiveNPC = mongoose.model("ActiveNPC", activeNPCSchema);

export default ActiveNPC;
