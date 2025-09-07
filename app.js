import "dotenv/config";
import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js";
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

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
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

          // 將新使用者資料儲存到資料庫
          await newUser.save();

          // 回覆玩家建立成功
          return res.send(wrapMessage(4, `${inputStr}建立成功`, 64));
        } catch (error) {
          console.error("建立角色時發生錯誤:", error);
          return res.send(wrapMessage(4, `發生了未知錯誤，請稍後再試。`, 64));
        }
      }

      // "items" command
      if (name === "items") {
        try {
          const allItems = await Item.find({});
          const itemList = allItems
            .map((item) => {
              return `${item.itemId}. ${item.itemName}: ${item.description}`;
            })
            .join("\n");
          return res.send(wrapMessage(4, itemList || "查無道具", 0));
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
          const itemDocument = await Item.findOne({ itemName: itemName });

          if (!itemDocument) {
            return res.send(wrapMessage(4, `${inputStr}查無此道具`, 64));
          }
          // 將 Mongoose 文件轉換為純 JavaScript 物件
          const item = itemDocument.toObject();
          // 組合道具資訊
          const attributesFields = Object.entries(item.attributes).map(
            ([key, value]) => {
              // 將屬性名稱的 key 轉成中文
              const name = translateAttributes(key);

              // 回傳一個符合格式的物件
              return {
                name: name,
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

      // "crafting" command
      if (name === "crafting") {
      }

      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: "unknown command" });
    }

    if (type === InteractionType.MESSAGE_COMPONENT) {
      return;
    }

    console.error("unknown interaction type", type);
    return res.status(400).json({ error: "unknown interaction type" });
  }
);

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
