import express from "express";
import mongoose from "mongoose";
import OpenAI from "openai";

const app = express();

/* ---------- MongoDB ---------- */
mongoose.connect("mongodb://127.0.0.1:27017/edtech");

const TimerSchema = new mongoose.Schema({
    minutes: Number
});

const Timer = mongoose.model("Timer", TimerSchema);

/* ---------- OpenAI ---------- */
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/* ---------- API ---------- */
app.get("/generate-topic", async (req, res) => {
    try {
        // 1️⃣ Get duration from DB
        const timer = await Timer.findOne();
        if (!timer) return res.json({ error: "Timer not found" });

        // 2️⃣ Ask AI to generate FULL topic
        const ai = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an EdTech content generator. Respond ONLY in valid JSON."
                },
                {
                    role: "user",
                    content: `
Create ONE study topic using the following structure.

Duration: ${timer.minutes} minutes

Return JSON with:
- title
- roadmap
- description
- order
- duration
- videoLinks: { english, tamil, hindi }
- documentation (markdown)

Make it beginner friendly.
`
                }
            ]
        });

        // 3️⃣ Parse AI JSON
        const topic = JSON.parse(ai.choices[0].message.content);

        // 4️⃣ Send response
        res.json(topic);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ---------- Server ---------- */
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
