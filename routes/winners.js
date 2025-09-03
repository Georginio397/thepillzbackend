
import express from "express";
import Winner from "../models/Winner.js";
import Leaderboard from "../models/Leaderboard.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const winners = await Winner.find().sort({ date: -1 }).limit(10);
    res.json(winners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/finalize", async (req, res) => {
  try {
    const highscores = await Leaderboard.find()
      .sort({ score: -1 })
      .limit(3)
      .select("username score -_id");

    const coins = await Leaderboard.find()
      .sort({ coinsTotal: -1 })
      .limit(3)
      .select("username coinsTotal -_id");

    const winnerRound = new Winner({
      highscores,
      coins,
    });

    await winnerRound.save();

    res.json({ message: "Winners saved!", winnerRound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
