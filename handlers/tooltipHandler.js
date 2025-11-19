import Item from "../models/item.model.js";
import { EmbedBuilder } from "discord.js";
import { isLegalStr, wrapMessage } from "../utils.js";

async function showItemDetail(interaction, res) {
  const options = interaction.data.options;
  const itemName = options.find((opt) => opt.name === "道具名稱").value;
  const inputStr = `輸入內容：${itemName}\n`;
  if (!isLegalStr(itemName)) {
    return res.send(wrapMessage(4, inputStr + "名稱不可包含符號", 64));
  }
  try {
    // 從資料庫查詢道具資訊
    const item = await Item.findOne({ name: itemName }).lean();

    if (!item) {
      return res.send(wrapMessage(4, `${inputStr}查無此道具`, 64));
    }
    // 組合道具資訊
    let embedDescription = `類型：${item.type ? item.type : "未知"}\n`;
    embedDescription += `重量：${item.weight}\n剩餘壽命：${
      item.durability > 0 ? item.durability : "無限"
    }\n`;

    embedDescription += "氣味：";
    if (item.smell && item.smell.type && item.smell.level > 0) {
      let name = "";
      switch (item.smell.type) {
        case "BLOODY":
          name = "血腥";
          break;
        case "STINKY":
          name = "惡臭";
          break;
        case "ROTTON":
          name = "腐爛";
          break;
        case "FISHY":
          name = "魚腥味";
          break;
        case "SMOKY":
          name = "煙燻";
          break;
        case "FLORAL":
          name = "花香";
          break;
        case "FRUITY":
          name = "果香";
          break;
        case "SPICY":
          name = "辛香";
          break;
        case "ROASTY":
          name = "烤香";
          break;
        case "HERBAL":
          name = "草本";
          break;
        case "SULFUR":
          name = "硫磺味";
          break;
        case "MUSK":
          name = "麝香味";
          break;
        default:
          break;
      }
      embedDescription += `${name} ${String(item.smell.level)}\n`;
    } else {
      embedDescription = "無\n";
    }

    embedDescription += "戰鬥屬性：";
    const combatStr = Object.entries(item.combatAttributes || {})
      .filter(([key, value]) => value !== 0)
      .map(([key, value]) => {
        let name = "";
        switch (key) {
          case "attackType":
            name = "攻擊類型";
            break;
          case "attack":
            name = "攻擊力";
            break;
          case "defense":
            name = "防禦力";
            break;
          default:
            break;
        }
        if (name) {
          return `${name} ${String(value)}`;
        }
      })
      .join("、");
    if (!combatStr) {
      embedDescription += "無\n";
    } else {
      embedDescription += `${combatStr}\n`;
    }

    embedDescription += "營養價值：";
    const nutritionStr = Object.entries(item.nutrition || {})
      .filter(([key, value]) => value !== 0)
      .map(([key, value]) => {
        let name = "";
        switch (key) {
          case "strength":
            name = "力量";
            break;
          case "speed":
            name = "速度";
            break;
          case "dexterity":
            name = "靈巧";
            break;
          case "spiritual":
            name = "精神";
            break;
          case "hp":
            name = "HP";
            break;
          case "mp":
            name = "MP";
            break;
          default:
            break;
        }
        if (name) {
          return `${name} ${String(value)}`;
        }
      })
      .join("、");
    if (!nutritionStr) {
      embedDescription += "無\n";
    } else {
      embedDescription += `${nutritionStr}\n`;
    }

    // 使用 Discord.js 的 EmbedBuilder 來建立嵌入式訊息
    const itemEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(itemName)
      .setDescription(`${item.description}\n\n${embedDescription}`)
      .setThumbnail(
        item.imageUrl || "https://example.com/default-item-image.png"
      ); // 在標題旁顯示小圖

    // 回覆包含嵌入式訊息的訊息
    return res.send(wrapMessage(4, "", 64, [itemEmbed]));
  } catch (err) {
    console.error("搜尋道具時發生錯誤:", err);
  }
}

export default showItemDetail;
