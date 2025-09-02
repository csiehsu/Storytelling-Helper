import "dotenv/config";
import mongoose from "mongoose";
const uri = process.env.MONGODB_URI;

async function run() {
  try {
    // Connect the client to the server
    await mongoose.connect(uri);
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
export default run;
