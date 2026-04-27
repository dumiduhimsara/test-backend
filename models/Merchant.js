import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema({
    shopName: { type: String, required: true }, // කඩේ නම
    ownerName: { type: String, required: true }, // අයිතිකරුගේ නම
    phone: { type: String, required: true, unique: true }, // ලොගින් වෙන්න නම්බර් එක
    email: { type: String, unique: true, sparse: true }, // Email එක අනිවාර්ය නැහැ (Option)
    password: { type: String, required: true }, // Password එක
    subscriptionStatus: { type: String, default: 'active' }, // සල්ලි ගෙවලාද නැද්ද කියලා බලන්න
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Merchant", merchantSchema);