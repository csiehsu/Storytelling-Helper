import "dotenv/config";
import { InstallGlobalCommands } from "./utils.js";

// types: 1 = slash commands, 2 = user commands, 3 = message commands
// integration_types: where the command is registered. 0 = guild(server), 1 = DM
// contexts: where the command is shown/usable. 0 = server text channel, 1 = DM, 2 = server threads
// option types: 3 = string, 4 = integer, 5 = boolean, 6 = user, 7 = channel, 8 = role, 9 = mentionable, 10 = number
const INVENTORY_COMMAND = {
  name: "inventory",
  description: "查看道具欄",
  type: 1,
  integration_types: [0],
  contexts: [0, 2],
};

const ITEM_DETAIL_COMMAND = {
  name: "item_detail",
  description: "查看道具資料",
  type: 1,
  integration_types: [0],
  contexts: [0, 2],
  options: [
    {
      name: "道具名稱",
      description: "請輸入道具名稱",
      type: 3,
      required: true,
    },
  ],
};

const START_COMMAND = {
  name: "start",
  description: "建立角色開始遊戲，能力值總和須為30",
  options: [
    {
      name: "角色名稱",
      description: "請輸入角色名稱，20字以內",
      type: 3,
      required: true,
    },
    {
      name: "力量值",
      description: "影響負重與攻擊力，1 以上",
      type: 4,
      required: true,
    },
    {
      name: "速度值",
      description: "影響迴避、命中與行動順序，1 以上",
      type: 4,
      required: true,
    },
    {
      name: "靈巧值",
      description: "影響製作與採集速度，1 以上",
      type: 4,
      required: true,
    },
  ],
};

const GATHER_COMMAND = {
  name: "gather",
  description: "採集物品",
};

const CRAFT_COMMAND = {
  name: "craft",
  description: "選擇製作配方",
};

const LIKABILITY_COMMAND = {
  name: "likability",
  description: "查看好感度",
};

const ALL_COMMANDS = [
  INVENTORY_COMMAND,
  ITEM_DETAIL_COMMAND,
  START_COMMAND,
  GATHER_COMMAND,
  CRAFT_COMMAND,
  LIKABILITY_COMMAND,
];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
