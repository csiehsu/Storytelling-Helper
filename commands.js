import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// types: 1 = slash commands, 2 = user commands, 3 = message commands
// integration_types: where the command is registered. 0 = guild(server), 1 = DM
// contexts: where the command is shown/usable. 0 = server text channel, 1 = DM, 2 = server threads
// Simple test command
const ITEMS_COMMAND = {
  name: "items",
  description: "查看道具欄",
  type: 1,
  integration_types: [0],
  contexts: [0, 2],
};

const START_COMMAND = {
  name: "start",
  description: "建立角色開始遊戲",
  options: [
    {
      name: "角色名稱",
      description: "請輸入你的角色名稱",
      type: 3, // string
      required: true,
    },
  ],
};

const CRAFTING_COMMAND = {
  name: "crafting",
  description: "選擇製作配方",
};

const LIKABILITY_COMMAND = {
  name: "likability",
  description: "查看好感度",
};

const ALL_COMMANDS = [
  ITEMS_COMMAND,
  START_COMMAND,
  CRAFTING_COMMAND,
  LIKABILITY_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
