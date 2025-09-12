// only for testing
import connectDB from "./database.js";
import Item from "./models/item.model.js";
import User from "./models/user.model.js";
import Inventory from "./models/inventory.model.js";
import Location from "./models/location.model.js";

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

const newItem = new Item({
  itemId: "item001",
  name: "小魚",
  description: "一條充滿活力的小魚，尾巴還在奮力的拍打著。",
  imageUrl:
    "https://res.cloudinary.com/duqyw1uhq/image/upload/v1757598031/basic_fish_aingye.png",
  type: "食材",
  attributes: {
    weight: 1,
  },
});
await newItem.save();
