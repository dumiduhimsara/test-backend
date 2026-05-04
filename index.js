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
        const { shopName, ownerName, phone, shopAddress, nicNumber, password } = req.body;
        
        const existingShop = await Merchant.findOne({ phone });
        if (existingShop) return res.status(400).json({ message: "Phone number already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ අලුතින් එකතු කළ කොටස: දින 30ක Free Trial එකක් සැකසීම
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);

        const newMerchant = new Merchant({ 
            shopName, 
            ownerName, 
            phone, 
            shopAddress, 
            nicNumber,    
            password: hashedPassword,
            expiryDate: trialExpiry, // ✅ Trial කාලය ඇතුළත් කිරීම
            subscriptionStatus: 'active', // ✅ තත්ත්වය active ලෙස දැමීම
            isBlocked: false // ✅ Default unblocked ලෙස දැමීම
        });

        await newMerchant.save();
        res.status(201).json({ message: "Shop Registered Successfully with 30-day Free Trial! ✅" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Shop Owner Login (Security Checks සමඟ) ---
app.post("/login-shop", async (req, res) => {
    try {
        const { phone, password } = req.body;
        const merchant = await Merchant.findOne({ phone }); 
        
        if (!merchant) return res.status(401).json({ message: "Invalid phone or password" });

        // ✅ 1. Admin විසින් Block කර ඇත්නම් ඇතුළු වීමට ඉඩ නොදීම
        if (merchant.isBlocked) {
            return res.status(403).json({ message: "ඔබේ ගිණුම තාවකාලිකව අත්හිටුවා ඇත. කරුණාකර සහාය ලබාගන්න." });
        }

        // ✅ 2. Subscription ඉකුත් වී ඇත්නම් දැනුම් දීම
        const today = new Date();
        if (merchant.expiryDate && today > new Date(merchant.expiryDate)) {
            return res.status(402).json({ message: "ඔබේ ගෙවීම් කාලය අවසන් වී ඇත. කරුණාකර ගිණුම අලුත් කරන්න." });
        }

        const isMatch = await bcrypt.compare(password, merchant.password);
        if (isMatch) {
            return res.status(200).json({ 
                message: "Login Successful", 
                merchant: { 
                    id: merchant._id, 
                    shopName: merchant.shopName, 
                    ownerName: merchant.ownerName,
                    subscriptionStatus: merchant.subscriptionStatus,
                    expiryDate: merchant.expiryDate // ✅ Dashboard එකේ Warning එක පෙන්වීමට දිනය යැවීම
                } 
            });
        }
        res.status(401).json({ message: "Invalid phone or password" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SUPER ADMIN APIs (Merchant පාලනය සඳහා) ---

// සියලුම මුදලාලිලාගේ විස්තර පාරිභෝගිකයින් ගණන සමඟ ලබාගැනීම
app.get("/admin/get-all-merchants", async (req, res) => {
    try {
        const merchants = await Merchant.find().select("-password").sort({ createdAt: -1 });
        
        const merchantDetails = await Promise.all(merchants.map(async (m) => {
            const customerCount = await Customer.countDocuments({ merchantId: m._id });
            return { ...m._doc, customerCount };
        }));

        res.status(200).json(merchantDetails);
    } catch (err) {
        res.status(500).json({ error: "දත්ත ලබාගැනීම අසාර්ථකයි" });
    }
});

// කඩයක් Block/Unblock කිරීම
app.put("/admin/toggle-block/:id", async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.params.id);
        if (!merchant) return res.status(404).json({ message: "Merchant not found" });

        merchant.isBlocked = !merchant.isBlocked;
        await merchant.save();
        res.status(200).json({ message: "Status updated", isBlocked: merchant.isBlocked });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Subscription Renew කිරීම (තව දින 30ක් ලබාදීම)
app.put("/admin/renew-subscription/:id", async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.params.id);
        if (!merchant) return res.status(404).json({ message: "Merchant not found" });

        let newExpiry = new Date();
        if (merchant.expiryDate && merchant.expiryDate > new Date()) {
            newExpiry = new Date(merchant.expiryDate);
        }
        newExpiry.setDate(newExpiry.getDate() + 30);

        merchant.expiryDate = newExpiry;
        merchant.subscriptionStatus = 'active';
        await merchant.save();

        res.status(200).json({ message: "Subscription Renewed!", newExpiry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Customer & Transactions Management ---

app.post("/add-customer", async (req, res) => {
    try {
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
        res.status(500).json({ error: err.message });
    }
});

app.put("/update-debt/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type, dueDate } = req.body; 

        const customer = await Customer.findById(id);
        if (!customer) return res.status(404).json({ message: "පාරිභෝගිකයා හමු වුණේ නැත." });

        if (type === 'add') {
            customer.debtAmount += Number(amount);
            if (dueDate) customer.dueDate = new Date(dueDate);
        } else if (type === 'settle') {
            customer.debtAmount -= Number(amount);
            if (customer.debtAmount <= 0) {
                customer.dueDate = null;
                customer.lastRemindedDate = null;
                customer.lastRemindedType = null;
            }
        }

        await customer.save();

        const newTransaction = new Transaction({
            customerId: customer._id,
            merchantId: customer.merchantId, 
            amount: Number(amount),
            type: type,
        });

        await newTransaction.save();

        res.status(200).json({ 
            message: "ණය මුදල සාර්ථකව යාවත්කාලීන කළා! ✅", 
            debtAmount: customer.debtAmount 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/get-customers/:merchantId", async (req, res) => {
    try {
        const customers = await Customer.find({ merchantId: req.params.merchantId });
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/delete-customer/:id", async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "පාරිභෝගිකයා සාර්ථකව ඉවත් කළා! 🗑️" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/get-history/:customerId", async (req, res) => {
    try {
        const history = await Transaction.find({ customerId: req.params.customerId }).sort({ date: -1 });
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json(err);
    }
});

// --- Reports APIs ---

app.get("/get-reports/:merchantId", async (req, res) => {
    try {
        const { merchantId } = req.params;
        const { from, to } = req.query;

        const transactions = await Transaction.find({
            merchantId: merchantId,
            date: {
                $gte: new Date(from),
                $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
            }
        })
        .populate('customerId', 'name') 
        .sort({ date: -1 });

        const validTransactions = transactions.filter(trx => trx.customerId !== null);

        const reportData = validTransactions.map(trx => ({
            date: trx.date,
            customerName: trx.customerId.name, 
            type: trx.type,
            amount: trx.amount
        }));

        res.status(200).json(reportData);
    } catch (err) {
        res.status(500).json({ error: "වාර්තා ලබා ගැනීම අසාර්ථකයි." });
    }
});

app.get("/get-master-report/:merchantId", async (req, res) => {
    try {
        const { merchantId } = req.params;
        const customers = await Customer.find({ merchantId });

        const fullReportData = await Promise.all(customers.map(async (customer) => {
            const transactions = await Transaction.find({ customerId: customer._id }).sort({ date: -1 });
            return { info: customer, history: transactions };
        }));
 
        res.status(200).json(fullReportData);
    } catch (err) {
        res.status(500).json({ error: "දත්ත ලබාගැනීම අසාර්ථකයි." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});