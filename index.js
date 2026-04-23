import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './user.js';

dotenv.config();

const app = express();

// CORS හරිම විදිහට සෙට් කරමු
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ඩේටාබේස් කනෙක්ට් එක
const mongourl = process.env.MONGO_URL;
mongoose.connect(mongourl).then(() => {
    console.log("connected to database bosa");
}).catch((err) => {
    console.log("DB Error: ", err);
});

// --- වැදගත්ම කොටස: Health Check ---
// Railway එකට සර්වර් එක වැඩ කියලා දැනගන්න මේක ඕනේ
app.get("/", (req, res) => {
    res.status(200).send("Backend is Live!");
});

// Register Route
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const newUser = new User({ name, email, password });
        await newUser.save();
        res.status(201).json({ message: "User Registered!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password }); 
        if (user) {
            res.status(200).json({ message: "Login Successful", user });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Railway එකට අනිවාර්යයෙන්ම 0.0.0.0 ඕනේ
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});