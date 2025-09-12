import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import express from "express";
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from "discord-interactions";
import connectDB from "./database.js";
import Item from "./models/item.model.js";
import User from "./models/user.model.js";
import Inventory from "./models/inventory.model.js";
import Location from "./models/location.model.js";
import gatherHandler from "./handlers/gatherHandler.js";
import {
  validateStartParameters,
  isLegalStr,
  wrapMessage,
  translateAttributes,
} from "./utils.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// connect to database
const startApp = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  }
};

startApp();

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction id, type and data
    const { id, type, data } = req.body;
    const userId = req.body.member.user.id;

    // PING request
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    // 普通指令
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;

      // "start" command
      if (name === "start") {
        // 從指令中取得參數
        const options = req.body.data.options;
        const characterName = options.find(
          (opt) => opt.name === "角色名稱"
        ).value;
        const str = options.find((opt) => opt.name === "力量值").value;
        const spd = options.find((opt) => opt.name === "速度值").value;
        const dex = options.find((opt) => opt.name === "靈巧值").value;
        const inputStr = `輸入內容：${characterName} 力量${str} 速度${spd} 靈巧${dex}\n`;

        // 呼叫驗證函式
        const validationError = validateStartParameters(
          characterName,
          str,
          spd,
          dex
        );
        if (validationError) {
          return res.send(wrapMessage(4, inputStr + validationError, 64));
        }
        try {
          // 檢查使用者在資料庫中是否已經有角色
          const existingUser = await User.findOne({
            $or: [{ userId: userId }, { characterName: characterName }],
          });
          if (existingUser) {
            return res.send(wrapMessage(4, `${inputStr}玩家或角色已存在`, 64));
          }

          // 建立新使用者
          const newUser = new User({
            userId: userId,
            characterName: characterName,
            stats: { strength: str, speed: spd, dexterity: dex },
          });
          await newUser.save();

          // 建立使用者的道具欄
          const newInventory = new Inventory({ userId: userId, items: [] });
          await newInventory.save();

          // 回覆玩家建立成功
          return res.send(wrapMessage(4, `${inputStr}建立成功`, 64));
        } catch (error) {
          console.error("建立角色時發生錯誤:", error);
          return res.send(wrapMessage(4, `發生了未知錯誤，請稍後再試。`, 64));
        }
      }

      // "inventory" command
      if (name === "inventory") {
        try {
          // 使用 .lean() 讓查詢結果回傳一個純粹的 JavaScript 物件，以提高效能
          const user = await User.findOne({ userId }).lean();
          if (!user) {
            return res.send(wrapMessage(4, "尚未建立玩家", 0));
          }
          const userInventory = await Inventory.findOne({ userId }).lean();
          if (!userInventory) {
            return res.send(wrapMessage(4, "查無道具欄，請洽管理員", 0));
          }

          let inventoryContent = "空空如也";
          // 先找道具欄，再根據裡面的 itemID 從 Item collection 中查詢道具詳細資訊
          // 從中撈出 id 跟 name 做對應表 (Map 專門用來儲存 key-value pairs，查找快速)
          if (userInventory.items.length > 0) {
            const itemIds = userInventory.items.map((item) => item.itemId);
            const items = await Item.find({ itemId: { $in: itemIds } }).lean();
            const itemMap = new Map(
              items.map((item) => [item.itemId, item.name])
            );

            // 最後再掃一次道具欄，對照對應表組合出道具名稱跟數量輸出字串
            inventoryContent = userInventory.items
              .map((invItem) => {
                const itemDetails = itemMap.get(invItem.itemId);
                if (itemDetails) {
                  return `${itemDetails} x ${invItem.quantity}`;
                }
                return `未知道具 (${invItem.itemId}) x ${invItem.quantity}`;
              })
              .join("\n");
          }

          const inventoryEmbed = new EmbedBuilder()
            .setColor("#F6C555")
            .setTitle(`**${user.characterName}** 的道具欄`)
            .setDescription(inventoryContent)
            .setFooter({ text: "欲查看道具請輸入 /item_detail" });

          return res.send(wrapMessage(4, "", 64, [inventoryEmbed]));
        } catch (err) {
          console.error("搜尋道具時發生錯誤:", err);
        }
      }

      // "item_detail" command
      if (name === "item_detail") {
        const options = req.body.data.options;
        const itemName = options.find((opt) => opt.name === "道具名稱").value;
        const inputStr = `輸入內容：${itemName}\n`;
        if (!isLegalStr(itemName)) {
          return res.send(wrapMessage(4, inputStr + "名稱不可包含符號", 64));
        }
        try {
          // 從資料庫查詢道具資訊
          const itemDocument = await Item.findOne({ name: itemName });

          if (!itemDocument) {
            return res.send(wrapMessage(4, `${inputStr}查無此道具`, 64));
          }
          // 將 Mongoose 文件轉換為純 JavaScript 物件
          const item = itemDocument.toObject();
          // 組合道具資訊
          const attributesFields = Object.entries(item.attributes).map(
            ([key, value]) => {
              // 將屬性名稱的 key 轉成中文
              const translatedName = translateAttributes(key);

              // 回傳一個符合格式的物件
              return {
                name: translatedName,
                value: String(value), // 值必須是字串
                inline: true,
              };
            }
          );

          // 使用 Discord.js 的 EmbedBuilder 來建立嵌入式訊息
          const itemEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(itemName)
            .setDescription(item.description || "無描述")
            .setThumbnail(
              item.imageUrl || "https://example.com/default-item-image.png"
            ) // 在標題旁顯示小圖
            .addFields(
              // 新增欄位來顯示道具屬性
              { name: "類型", value: item.type || "未知", inline: true },
              ...attributesFields
            );

          // 回覆包含嵌入式訊息的訊息
          return res.send(wrapMessage(4, "", 64, [itemEmbed]));
        } catch (err) {
          console.error("搜尋道具時發生錯誤:", err);
        }
      }

      // gather command
      if (name === "gather") {
        try {
          const channelId = req.body.channel_id;
          const location = await Location.findOne({ channelId }).lean();
          if (
            !location ||
            !location.gatherables ||
            location.gatherables.length === 0
          ) {
            return res.send(wrapMessage(4, "無法在此採集", 64));
          }

          const items = await Item.find({
            itemId: { $in: location.gatherables.map((g) => g.itemId) },
          }).lean();
          if (items.length === 0) {
            return res.send(wrapMessage(4, "未找到可採集的物品", 64));
          }

          // 建立下拉式選單的選項
          const options = items.map((item) => ({
            label: item.name,
            value: item.itemId,
            description: `機率：${
              location.gatherables.find((g) => g.itemId === item.itemId).chance
            }%`,
          }));
          const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("gather_select")
              .setPlaceholder("未選擇")
              .addOptions(options)
          );

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "請選擇要採集的資源：",
              components: [row.toJSON()],
            },
          });
        } catch (err) {
          console.error("採集資源時發生錯誤:", err);
        }
      }

      // "craft" command
      if (name === "craft") {
      }

      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: "unknown command" });
    }

    // 按鈕或下拉選單等元件互動
    if (type === InteractionType.MESSAGE_COMPONENT) {
      // 當初在 Components 裡面設定的 custom_id
      const customId = data.custom_id;
      if (customId === "gather_select") {
        // 當初 options 裡面的 value
        const itemId = data.values[0];
        await gatherHandler(req.body, itemId, res);
      }
      return;
    }

    // 動態指令（自動完成選項）
    if (type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
      return;
    }

    console.error("unknown interaction type", type);
    return res.status(400).json({ error: "unknown interaction type" });
  }
);

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
