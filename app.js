import "dotenv/config";
import express from "express";
import {
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from "discord-interactions";
import connectDB from "./database.js";
import { initializeMapCache } from "./services/mapCache.js";
import createCharacter from "./handlers/createCharacterHandler.js";
import showInventory from "./handlers/inventoryHandler.js";
import showItemDetail from "./handlers/tooltipHandler.js";
import {
  showGatherMenu,
  handleGatherSelect,
} from "./handlers/gatherHandler.js";
import handleCraftCommand from "./handlers/craftHandler.js";
import handleRecipeSelect from "./handlers/craftSelectHandler.js";
import handleCraftUpdate from "./handlers/craftUpdateHandler.js";
import handleCraftSubmit from "./handlers/craftSubmitHandler.js";
import handleCraftOutput from "./handlers/craftOutputHandler.js";
import handleUseCommand from "./handlers/useHandler.js";
import {
  showMoveCommand,
  handleMoveSelectMenu,
  handleMoveContinue,
  handleMoveStop,
} from "./handlers/moveHandler.js";
import {
  handleUseItemSelect,
  handleUseQuantitySelect,
} from "./handlers/useSelectHandler.js";
import handleCombatCommand from "./handlers/combatHandler.js";
import handleTossCommand from "./handlers/interactionHandler.js";
import handleSayCommand from "./handlers/sayHandler.js";
import {
  handleReloadMapCommand,
  handleSetMapConnectionCommand,
} from "./handlers/mapHandler.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// connect to database
const startApp = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully.");
    await initializeMapCache();
    console.log("Map cache initialized successfully.");
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
        await createCharacter(req.body, res);
        return;
      }

      // "inventory" command
      if (name === "inventory") {
        await showInventory(req.body, res);
        return;
      }

      // "item_detail" command
      if (name === "item_detail") {
        await showItemDetail(req.body, res);
        return;
      }

      // gather command
      if (name === "gather") {
        await showGatherMenu(req.body, res);
        return;
      }

      // "craft" command
      if (name === "craft") {
        await handleCraftCommand(req.body, res);
        return;
      }

      if (name === "use") {
        await handleUseCommand(req.body, res);
        return;
      }

      if (name === "move") {
        await showMoveCommand(req.body, res);
        return;
      }

      if (name === "say") {
        await handleSayCommand(req.body, res);
        return;
      }

      if (name === "reload_map") {
        await handleReloadMapCommand(req.body, res);
        return;
      }

      if (name === "set_map_connection") {
        await handleSetMapConnectionCommand(req.body, res);
        return;
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
        await handleGatherSelect(req.body, itemId, res);
        return;
      }
      if (customId === "craft_select") {
        await handleRecipeSelect(req.body, res);
        return;
      }
      if (customId.startsWith("craft_material_select")) {
        await handleCraftUpdate(req.body, res);
        return;
      }
      if (customId.startsWith("craft_quantity_select")) {
        await handleCraftSubmit(req.body, res);
        return;
      }
      if (customId.startsWith("craft_submit")) {
        await handleCraftOutput(req.body, res);
        return;
      }
      if (customId.startsWith("use_item_select")) {
        await handleUseItemSelect(req.body, res);
        return;
      }
      if (customId.startsWith("use_quantity_select")) {
        await handleUseQuantitySelect(req.body, res);
        return;
      }

      if (customId.startsWith("combat_")) {
        await handleCombatCommand(req.body, res);
        return;
      }

      if (customId.startsWith("toss_item_")) {
        await handleTossCommand(req.body, res);
        return;
      }

      if (customId.startsWith("move_select_menu")) {
        await handleMoveSelectMenu(req.body, res);
        return;
      }

      if (customId.startsWith("move_continue_")) {
        await handleMoveContinue(req.body, res);
        return;
      }

      if (customId.startsWith("move_stop")) {
        await handleMoveStop(req.body, res);
        return;
      }
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
