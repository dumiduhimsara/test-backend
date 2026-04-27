import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true }, 
    phone: { type: String, required: true, unique: true }, 
    shopAddress: { type: String, required: true },
    nicNumber: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }, 
    password: { type: String, required: true }, 
    subscriptionStatus: { type: String, default: 'active' }, 
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Merchant", merchantSchema);