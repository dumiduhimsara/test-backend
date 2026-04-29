import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Merchant from './models/Merchant.js'; 
import bcrypt from 'bcrypt';
import Customer from './models/Customer.js';
import Transaction from "./models/Transaction.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Database Connection
const mongourl = process.env.MONGO_URL;
mongoose.connect(mongourl).then(() => {
    console.log("SSK Database Connected! 🚀");
}).catch((err) => {
    console.log("DB Error: ", err);
});

app.get("/", (req, res) => {
    res.status(200).send("SSK Backend is Live!");
});

// --- Shop Owner Registration ---
app.post("/register-shop", async (req, res) => {
    try {
        // 1. req.body එකෙන් අලුත් fields දෙකත් ගන්න (shopAddress, nicNumber) 👇
        const { shopName, ownerName, phone, shopAddress, nicNumber, password } = req.body;
        
        // කලින් මේ නම්බර් එකෙන් කඩයක් තියෙනවද බලමු
        const existingShop = await Merchant.findOne({ phone });
        if (existingShop) return res.status(400).json({ message: "Phone number already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. මෙතනටත් ඒ fields දෙක ඇතුළත් කරන්න 👇
        const newMerchant = new Merchant({ 
            shopName, 
            ownerName, 
            phone, 
            shopAddress, 
            nicNumber,    
            password: hashedPassword 
        });

        await newMerchant.save();
        res.status(201).json({ message: "Shop Registered Successfully!" });
    } catch (err) {
        // මෙතන console.log එකක් දැම්මොත් ලෙඩේ Railway Logs වල බලාගන්න ලේසියි
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Shop Owner Login (Phone & Password) ---
app.post("/login-shop", async (req, res) => {
    try {
        const { phone, password } = req.body;
        const merchant = await Merchant.findOne({ phone }); 
        
        if (merchant) {
            // Bcrypt පාවිච්චි කරලා පාස්වර්ඩ් එක ගලපලා බලන්න 👇
            const isMatch = await bcrypt.compare(password, merchant.password);
            if (isMatch) {
                return res.status(200).json({ 
                    message: "Login Successful", 
                    merchant: { id: merchant._id, shopName: merchant.shopName, ownerName: merchant.ownerName } 
                });
            }
        }
        res.status(401).json({ message: "Invalid phone or password" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- add customer ---

app.post("/add-customer", async (req, res) => {
    try {
        // debtAmount එකත් body එකෙන් ගන්නවා 👇
        const { name, phone, address, debtAmount, merchantId } = req.body; 

        const existingCustomer = await Customer.findOne({ phone });
        if (existingCustomer) {
            return res.status(400).json({ message: "මෙම දුරකථන අංකය දැනටමත් පද්ධතියේ ඇත." });
        }

        const newCustomer = new Customer({
            name,
            phone,
            address,
            debtAmount: debtAmount || 0, 
            merchantId
        });

        await newCustomer.save();
        res.status(201).json({ message: "පාරිභෝගිකයා සාර්ථකව ඇතුළත් කළා! ✅" });
    } catch (err) {
        console.error("Add Customer Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// index.js (Backend)

// ණය මුදල Update කිරීමේ API එක
app.put("/update-debt/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type } = req.body; 

        const customer = await Customer.findById(id);
        if (!customer) return res.status(404).json({ message: "පාරිභෝගිකයා හමු වුණේ නැත." });

        // 1. පාරිභෝගිකයාගේ මුළු ණය මුදල වෙනස් කිරීම
        if (type === 'add') {
            customer.debtAmount += Number(amount);
        } else if (type === 'settle') {
            customer.debtAmount -= Number(amount);
        }

        await customer.save();

        // ✅ 2. අලුතින් Transaction එකක් (History එකක්) සේව් කිරීම
        // මෙතන customer.merchantId පාවිච්චි කරන්නේ ගනුදෙනුව අයිති කාටද කියලා දැනගන්නයි
        const newTransaction = new Transaction({
            customerId: customer._id,
            merchantId: customer.merchantId, 
            amount: Number(amount),
            type: type
        });

        await newTransaction.save();

        res.status(200).json({ 
            message: "ණය මුදල සාර්ථකව යාවත්කාලීන කර ඉතිහාසයට ඇතුළත් කළා! ✅", 
            debtAmount: customer.debtAmount 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// index.js (Backend) ඇතුළත

// මුදලාලිට අදාළ සියලුම පාරිභෝගිකයින් ලබා ගැනීම
app.get("/get-customers/:merchantId", async (req, res) => {
    try {
        const { merchantId } = req.params;
        
        // Merchant ID එකට ගැලපෙන අය විතරක් සොයනවා
        const customers = await Customer.find({ merchantId: merchantId });
        
        res.status(200).json(customers);
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// index.js (Backend)

// පාරිභෝගිකයෙක් ඉවත් කිරීමේ API එක
app.delete("/delete-customer/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await Customer.findByIdAndDelete(id);
        res.status(200).json({ message: "පාරිභෝගිකයා සාර්ථකව ඉවත් කළා! 🗑️" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/get-history/:customerId", async (req, res) => {
    try {
        const history = await Transaction.find({ customerId: req.params.customerId }).sort({ date: -1 }); // අලුත්ම ඒවා උඩට එන ලෙස sort කිරීම
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json(err);
    }
});
 
// වැඩිම ණය ඇති පාරිභෝගිකයෝ 5 දෙනා ලබා ගැනීම
app.get('/api/top-debtors/:merchantId', async (req, res) => {
    try {
        const { merchantId } = req.params;
        
        const topDebtors = await Customer.find({ merchantId: merchantId })
            .sort({ debtAmount: -1 }) 
            .limit(5);

        res.status(200).json(topDebtors);
    } catch (err) {
        res.status(500).json({ message: "දත්ත ලබා ගැනීම අසාර්ථකයි", error: err });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});