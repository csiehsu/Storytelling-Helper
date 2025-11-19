import User from "../models/user.model.js";
import Inventory from "../models/inventory.model.js";
import { validateStartParameters, wrapMessage } from "../utils.js";

async function createCharacter(interaction, res) {
  // 從指令中取得參數
  const options = interaction.data.options;
  const userId = interaction.member.user.id;
  const characterName = options.find((opt) => opt.name === "角色名稱").value;
  const str = options.find((opt) => opt.name === "力量值").value;
  const spd = options.find((opt) => opt.name === "速度值").value;
  const dex = options.find((opt) => opt.name === "靈巧值").value;
  const inputStr = `輸入內容：${characterName} 力量${str} 速度${spd} 靈巧${dex}\n`;

  // 呼叫驗證函式
  const validationError = validateStartParameters(characterName, str, spd, dex);
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
      learnedRecipes: ["recipe001"],
      skill: [{ skillId: "skill001" }],
    });
    await newUser.save();

    // 建立使用者的道具欄
    const existingInventory = await Inventory.findOne({ userId: userId });
    if (!existingInventory) {
      const newInventory = new Inventory({ userId: userId, items: [] });
      await newInventory.save();
    }

    // 回覆玩家建立成功
    return res.send(wrapMessage(4, `${inputStr}建立成功`, 64));
  } catch (error) {
    console.error("建立角色時發生錯誤:", error);
    return res.send(wrapMessage(4, `發生了未知錯誤，請稍後再試。`, 64));
  }
}

export default createCharacter;
