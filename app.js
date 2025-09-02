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

        try {
          // 檢查使用者在資料庫中是否已經有角色
          const existingUser = await User.findOne({
            $or: [{ userId: userId }, { characterName: characterName }],
          });
          if (existingUser) {
            return res.send({
              type: 4, // 類型 4 代表 CHANNEL_MESSAGE_WITH_SOURCE
              data: {
                content: `角色已存在，如需協助請聯絡管理員。`,
                flags: 64, // 標記為 64 (EPHEMERAL)，讓訊息只有使用者自己看得到
              },
            });
          }

          // 創建新使用者文件
          const newUser = new User({
            userId: userId,
            characterName: characterName,
          });

          // 將新使用者資料儲存到資料庫
          await newUser.save();

          // 回覆玩家，創建成功
          return res.send({
            type: 4,
            data: {
              content: `角色 **${characterName}** 建立成功`,
              flags: 64,
            },
          });
        } catch (error) {
          console.error("建立角色時發生錯誤:", error);

          if (error.code === 11000) {
            return res.send({
              type: 4,
              data: {
                content: "角色已存在，如需協助請聯絡管理員。",
                flags: 64,
              },
            });
          } else {
            return res.send({
              type: 4,
              data: {
                content: "發生了未知錯誤，請稍後再試。",
                flags: 64,
              },
            });
          }
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
          return res.send({
            type: 4,
            data: {
              flags: 64,
              content: itemList || "No items found.",
            },
          });
        } catch (err) {
          console.error("Error finding items:", err);
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
