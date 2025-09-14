// handlers/craftHandler.js
import User from "../models/user.model.js";
import Recipe from "../models/recipe.model.js";

async function handleCraftCommand(interaction, res) {
  try {
    const userId = interaction.member.user.id;
    const user = await User.findOne({ userId });

    if (!user || !user.learnedRecipes || user.learnedRecipes.length === 0) {
      res.json({
        type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: "還沒有學過任何配方",
          flags: 64, // 讓訊息只有使用者自己看得到
        },
      });
      return;
    }

    // 根據玩家學會的配方ID，去 Recipe 模型中查詢配方名稱
    const learnedRecipeDetails = await Recipe.find({
      recipeId: { $in: user.learnedRecipes },
    }).lean();

    // 建立下拉式選單和 ActionRow
    const selectOptions = learnedRecipeDetails.map((recipe) => ({
      label: recipe.name.ch,
      value: recipe.recipeId,
    }));

    const selectMenu = {
      type: 3, // SelectMenu
      custom_id: `craft_select`,
      placeholder: "未選擇",
      options: selectOptions,
    };

    const actionRow = {
      type: 1, // ActionRow
      components: [selectMenu],
    };

    // 回覆包含選單的訊息
    res.json({
      type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: "請選擇製作項目",
        flags: 64, // 讓訊息只有使用者自己看得到
        components: [actionRow],
      },
    });
  } catch (error) {
    console.error("處理製作指令時發生錯誤:", error);
    // 回覆錯誤訊息
    res.json({
      type: 4, // 回覆類型 4: CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: "處理製作指令時發生錯誤",
        flags: 64,
      },
    });
  }
}

export default handleCraftCommand;
