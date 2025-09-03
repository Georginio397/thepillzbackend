import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  wallet: { type: String, required: true },
  score: { type: Number, default: 0 },
  coinsTotal: { type: Number, default: 0 },
});

export default mongoose.model("User", userSchema);
