import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'dns';

import User from './user.js';

dns .setServers(["0.0.0.0","8.8.8.8"]);

dotenv.config();

const app=express();
const mongourl=process.env.MONGO_URL;

mongoose.connect(mongourl).then(()=>{
    console.log("connected to database bosa");
}).catch((err)=>{
    console.log(err);
});

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));



app.use(express.json());


// අනිත් routes වලට උඩින් මේක දාන්න
app.get("/", (req, res) => {
    res.send("Backend is live and running bosa!");
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

const PORT = process.env.PORT || 8080; // Railway එක 8080 හෝ PORT variable එක පාවිච්චි කරයි

app.listen(PORT, "0.0.0.0", () => {
    console.log(`server is running on port ${PORT}`);
});