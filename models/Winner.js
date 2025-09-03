import mongoose from "mongoose";

const winnerSchema = new mongoose.Schema({
  roundEnd: { type: Date, default: Date.now },
  topScores: [{ username: String, score: Number }],
  topCoins: [{ username: String, coinsTotal: Number }]
});

export default mongoose.model("Winner", winnerSchema);
