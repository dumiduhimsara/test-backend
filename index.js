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

app.use(cors());
app.use(express.json());

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
        const user = await User.findOne({ email, password }); // සරලව password එක චෙක් කිරීම
        
        if (user) {
            res.status(200).json({ message: "Login Successful", user });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000,()=>{
    console.log("server is running on port 3000");
});