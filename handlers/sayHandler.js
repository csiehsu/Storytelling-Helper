import Item from "../models/item.model.js";
import NPC from "../models/npc.model.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

async function handleSayCommand(interaction, res) {
  try {
    const options = interaction.data.options;
    // 0: 戰鬥遭遇, 1: 發現道具, 2: 其他純文字
    const messageType = Number(
      options.find((opt) => opt.name === "類型").value
    );
    const messageInfo = options.find((opt) => opt.name === "顯示資訊").value;
    const messageTitles = ["遭到攻擊", "發現道具", ""];
    let imageUrl;
    let embedFields;
    let actionRow;

    if (messageType === 2) {
      return res.json({
        type: 4,
        data: {
          content: messageInfo,
          flags: 64,
        },
      });
    } else if (messageType === 0) {
      const enemy = await NPC.findOne({ name: messageInfo });
      if (!enemy) {
        return res.json({
          type: 4,
          data: {
            content: "查無此敵人",
            flags: 64,
          },
        });
      }
      imageUrl =
        enemy.imageUrl ||
        "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgfS0in6gMHuhY1eRKdE2CmIlqajSj9_cartdRsYtaysGlttPkJi5RjEdJKB1-FQ1M2MtsSgI3ctEcpM2sIVnZJEq64K5VpyV-A1NVbtahoJNLy1kihk-wO3AaH2vzWv_4_8BL7iAy_NgBh/s800/pose_mark_hashiru_guruguru.png";

      embedFields = [
        { name: enemy.name, value: "", inline: false },
        { name: "", value: enemy.description || "", inline: false },
      ];

      const combatButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_fight`)
        .setLabel("戰鬥")
        .setStyle(ButtonStyle.Danger);

      const runButton = new ButtonBuilder()
        .setCustomId(`combat_${enemy.npcId}_run`)
        .setLabel("逃跑")
        .setStyle(ButtonStyle.Success);

      actionRow = new ActionRowBuilder().addComponents(combatButton, runButton);
    } else if (messageType === 1) {
      const item = await Item.findOne({ name: messageInfo });
      if (!item) {
        return res.json({
          type: 4,
          data: {
            content: "查無此道具",
            flags: 64,
          },
        });
      }

      imageUrl = item.imageUrl || "";
      embedFields = [
        { name: item.name, value: "", inline: false },
        { name: "", value: item.description || "", inline: false },
      ];

      const getButton = new ButtonBuilder()
        .setCustomId(`get_${item.itemId}`)
        .setLabel("獲得")
        .setStyle(ButtonStyle.Success);

      actionRow = new ActionRowBuilder().addComponents(getButton);
    } else {
      return res.json({
        type: 4,
        data: {
          content: "類型選項錯誤",
          flags: 64,
        },
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#51A8DD")
      .setTitle(messageTitles[messageType])
      .setImage(imageUrl)
      .addFields(embedFields);

    return res.json({
      type: 4,
      data: {
        embeds: [embed],
        components: [actionRow],
      },
    });
  } catch (error) {
    console.error("處理使用指令時發生錯誤:", error);
    res.json({
      type: 4,
      data: {
        content: "處理使用指令時發生錯誤",
        flags: 64,
      },
    });
  }
}

export default handleSayCommand;
