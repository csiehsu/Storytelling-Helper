import mongoose from "mongoose";

const skillSchema = new mongoose.Schema({
  skillId: {
    type: String,
    required: true,
    unique: true,
  },
  skillName: {
    type: String,
    required: true,
  },
});
const Skill = mongoose.model("Skill", skillSchema);

export default Skill;
