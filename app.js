import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
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
import { validateStartParameters, wrapMessage } from "./utils.js";

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
