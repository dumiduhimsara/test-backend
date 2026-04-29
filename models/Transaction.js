import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Customer', 
        required: true 
    },
    merchantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Merchant', 
        required: true 
    },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['add', 'settle'], required: true }, // 'add' (ණය එකතු කිරීම) හෝ 'settle' (ණය පියවීම)
    date: { type: Date, default: Date.now } // ගනුදෙනුව සිදුවූ දිනය සහ වෙලාව
});

export default mongoose.model("Transaction", transactionSchema);