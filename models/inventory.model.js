import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const inventorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  items: {
    type: [inventoryItemSchema],
    default: [],
  },
});

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;
