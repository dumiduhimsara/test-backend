import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    address: { type: String }, 
    points: { type: Number, default: 0 },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Customer", customerSchema);