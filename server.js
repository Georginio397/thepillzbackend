// server.js
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import cors from "cors";
import User from "./models/User.js";
import dotenv from "dotenv";
import Winner from "./models/Winner.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
  origin: "https://thepillz.vercel.app",
  credentials: true
}));

async function saveWinners() {
  const topScores = await User.find().sort({ score: -1 }).limit(3);
  const topCoins = await User.find().sort({ coinsTotal: -1 }).limit(3);

  const winner = new Winner({
    roundEnd: new Date(),
    topScores: topScores.map(u => ({ username: u.username, score: u.score })),
    topCoins: topCoins.map(u => ({ username: u.username, coinsTotal: u.coinsTotal }))
  });

  await winner.save();
  console.log("🏆 Winners saved for round!");
}

app.get("/winners", async (req, res) => {
  const data = await Winner.find().sort({ roundEnd: -1 }).limit(5); 
  res.json(data);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.post("/signup", async (req, res) => {
  try {
    const { username, password, wallet } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "Username already taken!" });

    if (!wallet) {
      return res.status(400).json({ error: "Wallet address is required!" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, wallet });
    await user.save();

    res.json({ message: "Account created successfully!", username: user.username, wallet: user.wallet });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Something went wrong during signup, try again later." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Incorrect username!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password!" });

    res.json({ 
      message: "Login successful!", 
      username: user.username, 
      score: user.score, 
      wallet: user.wallet 
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/score", async (req, res) => {
  try {
    const { username, score, coins } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (typeof score !== "number" || typeof coins !== "number") {
      return res.status(400).json({ error: "Invalid data" });
    }

    if (score > 500 || coins > 200) {
      return res.status(400).json({ error: "Impossible score detected" });
    }

    const now = Date.now();
    if (user.lastUpdate && now - user.lastUpdate < 5000) {
      return res.status(429).json({ error: "Too many score updates" });
    }

    const newHighScore = Math.max(user.score || 0, score);

    const updated = await User.findOneAndUpdate(
      { username },
      {
        $set: { 
          score: newHighScore,
          lastUpdate: now,
        },
        $inc: { coinsTotal: coins }
      },
      { new: true }
    );

    res.json({
      message: "Score saved",
      score: updated.score,
      coinsTotal: updated.coinsTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/leaderboard/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const highscores = await User.find().sort({ score: -1 }).limit(15);
    const coins = await User.find().sort({ coinsTotal: -1 }).limit(15);
    const user = await User.findOne({ username });

    if (!user) return res.json({ highscores, coins, user: null });

    const userScoreRank =
      (await User.countDocuments({ score: { $gt: user.score } })) + 1;
    const userCoinsRank =
      (await User.countDocuments({ coinsTotal: { $gt: user.coinsTotal } })) + 1;

    res.json({
      highscores: highscores.map((u, i) => ({
        username: u.username,
        score: u.score,
        rank: i + 1,
      })),
      coins: coins.map((u, i) => ({
        username: u.username,
        coinsTotal: u.coinsTotal,
        rank: i + 1,
      })),
      user: {
        username: user.username,
        score: user.score,
        coinsTotal: user.coinsTotal,
        scoreRank: userScoreRank,
        coinsRank: userCoinsRank,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/winners/close-round", async (req, res) => {
  try {
    const topScores = await User.find().sort({ score: -1 }).limit(3);
    const topCoins = await User.find().sort({ coinsTotal: -1 }).limit(3);

    const winners = new Winner({
      roundEnd: new Date(),
      topScores: topScores.map(u => ({ username: u.username, score: u.score })),
      topCoins: topCoins.map(u => ({ username: u.username, coinsTotal: u.coinsTotal }))
    });

    await winners.save();

    await User.updateMany({}, { $set: { score: 0, coinsTotal: 0 } });

    res.json({ 
      message: "🏆 Round closed, winners saved and scores reset!",
      winners 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
